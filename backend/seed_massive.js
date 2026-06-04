const fs = require('fs');
const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuración de Volúmenes (Stress Testing)
const NUM_ADMINS = 10000;
const NUM_BUSINESSES = 50000;
const NUM_CUSTOMERS = 200000;
const NUM_BOOKINGS = 500000; 
const CHUNK_SIZE = 2500; 

async function run() {
  console.log('Iniciando script de Stress Testing...');
  
  const envFile = fs.readFileSync('.env', 'utf8');
  const dbUrlMatch = envFile.match(/DATABASE_URL="(.*)"/);
  if (!dbUrlMatch) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  const dbUrl = dbUrlMatch[1];
  
  const client = new Client({
    connectionString: dbUrl,
  });

  await client.connect();
  console.log('Conectado a la base de datos de Supabase.');

  try {
    console.log('Limpiando base de datos (excepto root)...');
    await client.query('TRUNCATE TABLE payment, appointment, business CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    console.log('Generando hash de contraseña "1234"...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} empresarios (admins)...`);
    let adminIds = [];
    let queryValues = [];
    for (let i = 1; i <= NUM_ADMINS; i++) {
      const username = `admin_${i}_${faker.string.alphanumeric(4)}`;
      queryValues.push(`('${username}', '${faker.person.fullName().replace(/'/g, "''")}', '${String(i).padStart(8, '0')}X', 'u${i}_${faker.string.alphanumeric(6)}_${faker.internet.email().replace(/'/g, "''")}', '${passwordHash}', '${faker.image.avatar()}', 'admin')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_ADMINS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        adminIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} empresarios...`);
      }
    }

    console.log(`Generando ${NUM_BUSINESSES} negocios y sus cuentas locales...`);
    let businessIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_BUSINESSES; i++) {
      const adminId = faker.helpers.arrayElement(adminIds);
      const username = `local_${i}_${faker.string.alphanumeric(4)}`;
      const fakeNif = `B${String(i).padStart(7, '0')}`;
      queryValues.push(`('${username}', '${faker.company.name().replace(/'/g, "''")}', '${fakeNif}', 'b${i}_${faker.string.alphanumeric(6)}_${faker.internet.email().replace(/'/g, "''")}', '${passwordHash}', '${faker.image.avatar()}', 'business', ${adminId})`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_BUSINESSES) {
        const userQuery = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role) 
                           VALUES ${queryValues.map(q => q.split(", 'business', ")[0] + ", 'business')").join(',')} RETURNING id;`;
        const userRes = await client.query(userQuery);
        
        const bUsersIds = userRes.rows.map(r => r.id);
        
        let businessQueryValues = [];
        for (let j = 0; j < bUsersIds.length; j++) {
           const adminIdRel = queryValues[j].split(", 'business', ")[1].replace(')', '');
           const bName = queryValues[j].split("', '")[1].split("',")[0];
           businessQueryValues.push(`('${bName}', '${faker.location.streetAddress().replace(/'/g, "''")}', '${faker.phone.number()}', ${adminIdRel}, ${bUsersIds[j]})`);
        }

        const bQuery = `INSERT INTO business (nombre, direccion, telefono, "usuarioId", "businessUserId") VALUES ${businessQueryValues.join(',')} RETURNING id;`;
        const bRes = await client.query(bQuery);
        businessIds.push(...bRes.rows.map(r => r.id));
        
        queryValues = [];
        console.log(` Insertados ${i} negocios...`);
      }
    }

    console.log(`Generando ${NUM_CUSTOMERS} clientes (como usuarios)...`);
    let customerIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      const email = `c${i}_${faker.string.alphanumeric(6)}_${faker.internet.email().replace(/'/g, "''")}`;
      const username = email.split('@')[0];
      const nombreCompleto = `${faker.person.firstName().replace(/'/g, "''")} ${faker.person.lastName().replace(/'/g, "''")}`;
      const phone = faker.phone.number();

      const fakeDni = `${String(i).padStart(8, '0')}Z`;
      queryValues.push(`('${username}', '${nombreCompleto}', '${fakeDni}', '${email}', '${passwordHash}', '${faker.image.avatar()}', 'client', '${phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_CUSTOMERS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        customerIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} clientes (usuarios)...`);
      }
    }

    console.log(`Generando ${NUM_BOOKINGS} reservas y sus pagos correspondientes...`);
    let bEntityQueryValues = [];
    const statuses = ['pending', 'confirmed', 'paid'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Mantenimiento'];

    let paymentCount = 0;

    for (let i = 1; i <= NUM_BOOKINGS; i++) {
      let cId, bId;

      // Garantizar que todos los negocios tengan al menos una reserva
      if (i <= businessIds.length) {
        bId = businessIds[i - 1];
        cId = faker.helpers.arrayElement(customerIds);
      } 
      // Garantizar que todos los clientes tengan al menos una reserva
      else if (i <= businessIds.length + customerIds.length) {
        cId = customerIds[i - 1 - businessIds.length];
        bId = faker.helpers.arrayElement(businessIds);
      } 
      // Reservas restantes aleatorias
      else {
        cId = faker.helpers.arrayElement(customerIds);
        bId = faker.helpers.arrayElement(businessIds);
      }

      const status = faker.helpers.arrayElement(statuses);
      const date = faker.date.recent({ days: 60 }).toISOString().split('T')[0];
      const time = `${faker.number.int({ min: 8, max: 20 })}:00`;
      const serviceName = faker.helpers.arrayElement(services);

      bEntityQueryValues.push(`('${date}', '${time}', '${status}', ${cId}, ${bId}, '${serviceName}')`);



      if (bEntityQueryValues.length >= CHUNK_SIZE || i === NUM_BOOKINGS) {
        const bQuery = `INSERT INTO appointment (date, time, status, "usuarioId", "businessId", "serviceName") VALUES ${bEntityQueryValues.join(',')} ON CONFLICT ("date", "time", "businessId") DO NOTHING RETURNING id;`;
        const bRes = await client.query(bQuery);
        const insertedBookingIds = bRes.rows.map(r => r.id);

        if (insertedBookingIds.length > 0) {
          const paymentQueryValues = insertedBookingIds.map(bookingId => {
             const pStatus = faker.helpers.arrayElement(['pagado', 'pendiente']);
             const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'bizum']);
             const amount = faker.number.int({ min: 10, max: 200 });
             const pDate = faker.date.recent({ days: 60 }).toISOString().split('T')[0];
             paymentCount++;
             return `('${pDate}', '${pStatus}', '${pType}', ${amount}, ${bookingId})`;
          });
          const pQuery = `INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`;
          await client.query(pQuery);
        }

        bEntityQueryValues = [];
        console.log(` Insertadas ${i} reservas (con sus pagos)...`);
      }
    }

    console.log(`\n¡Stress Test Seeding completado con éxito!`);
    console.log(`- Empresarios: ${NUM_ADMINS}`);
    console.log(`- Negocios: ${NUM_BUSINESSES}`);
    console.log(`- Clientes: ${NUM_CUSTOMERS}`);
    console.log(`- Citas (Doble tabla): ${NUM_BOOKINGS}`);
    console.log(`- Pagos insertados: ~${paymentCount}`);

  } catch (error) {
    console.error('Error durante el seeding:', error);
  } finally {
    await client.end();
  }
}

run();
