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
    await client.query('TRUNCATE TABLE payment, appointment, booking_entity, customers, business CASCADE;');
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
      queryValues.push(`('${username}', '${faker.company.name().replace(/'/g, "''")}', NULL, 'b${i}_${faker.string.alphanumeric(6)}_${faker.internet.email().replace(/'/g, "''")}', '${passwordHash}', '${faker.image.avatar()}', 'business', ${adminId})`);
      
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

    console.log(`Generando ${NUM_CUSTOMERS} clientes...`);
    let customerIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      queryValues.push(`('${faker.person.firstName().replace(/'/g, "''")}', '${faker.person.lastName().replace(/'/g, "''")}', 'c${i}_${faker.string.alphanumeric(6)}_${faker.internet.email().replace(/'/g, "''")}', '${faker.phone.number()}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_CUSTOMERS) {
        const query = `INSERT INTO customers (name, surname, email, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        customerIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} clientes...`);
      }
    }

    console.log(`Generando ${NUM_BOOKINGS} reservas y sus pagos correspondientes...`);
    let apptQueryValues = [];
    let bEntityQueryValues = [];
    let paymentData = [];
    const statuses = ['pending', 'confirmed', 'paid'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Mantenimiento'];

    let paymentCount = 0;

    for (let i = 1; i <= NUM_BOOKINGS; i++) {
      const cId = faker.helpers.arrayElement(customerIds);
      const bId = faker.helpers.arrayElement(businessIds);
      const status = faker.helpers.arrayElement(statuses);
      const date = faker.date.recent({ days: 60 }).toISOString().split('T')[0];
      const time = `${faker.number.int({ min: 8, max: 20 })}:00`;
      const serviceName = faker.helpers.arrayElement(services);

      apptQueryValues.push(`('${date}', '${time}', '${status}', ${cId}, ${bId}, '${serviceName}')`);
      bEntityQueryValues.push(`('${date}', '${time}', '${status}', ${cId}, ${bId}, '${serviceName}')`);

      paymentCount++;
      const pStatus = status === 'paid' ? 'pagado' : 'pendiente';
      const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'bizum']);
      const amount = faker.number.int({ min: 10, max: 200 });
      paymentData.push({ index: bEntityQueryValues.length - 1, date, pStatus, pType, amount });

      if (apptQueryValues.length >= CHUNK_SIZE || i === NUM_BOOKINGS) {
        const aQuery = `INSERT INTO appointment (date, time, status, "customerId", "businessId", "serviceName") VALUES ${apptQueryValues.join(',')} ON CONFLICT ("date", "time", "businessId") DO NOTHING;`;
        await client.query(aQuery);
        
        const bQuery = `INSERT INTO booking_entity (date, time, status, "customerId", "businessId", "serviceName") VALUES ${bEntityQueryValues.join(',')} RETURNING id;`;
        const bRes = await client.query(bQuery);
        const insertedBookingIds = bRes.rows.map(r => r.id);

        if (paymentData.length > 0) {
          const paymentQueryValues = paymentData.map(p => {
             const bookingId = insertedBookingIds[p.index];
             return `('${p.date}', '${p.pStatus}', '${p.pType}', ${p.amount}, ${bookingId})`;
          });
          const pQuery = `INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`;
          await client.query(pQuery);
        }

        apptQueryValues = [];
        bEntityQueryValues = [];
        paymentData = [];
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
