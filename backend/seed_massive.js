const fs = require('fs');
const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuración de Volúmenes (Stress Testing)
const NUM_ADMINS = 1000;
const NUM_BUSINESSES = 5000;
const NUM_CUSTOMERS = 20000;
const NUM_BOOKINGS = 50000; 
const CHUNK_SIZE = 2500; 

function generateUserSense(role) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nombreCompleto = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '') + '_' + faker.string.alphanumeric(4);
  const email = `${username}@${role === 'admin' ? 'empresa' : 'cliente'}.com`;
  const phone = faker.phone.number('+34 ### ### ###');
  const profilePicture = faker.image.avatar();
  
  return { nombreCompleto, username, email, phone, profilePicture };
}

require('dotenv').config();

async function run() {
  console.log('Iniciando script de Stress Testing...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  
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
      const u = generateUserSense('admin');
      const dni = `${String(i).padStart(8, '0')}X`;
      queryValues.push(`('${u.username}', '${u.nombreCompleto.replace(/'/g, "''")}', '${dni}', '${u.email}', '${passwordHash}', '${u.profilePicture}', 'admin', '${u.phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_ADMINS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        adminIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} empresarios...`);
      }
    }

    console.log(`Generando ${NUM_BUSINESSES} negocios...`);
    let businessIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_BUSINESSES; i++) {
      const adminId = faker.helpers.arrayElement(adminIds);
      const bName = faker.company.name().replace(/'/g, "''");
      const bDir = faker.location.streetAddress().replace(/'/g, "''");
      const bPhone = faker.phone.number('+34 ### ### ###');
      
      queryValues.push(`('${bName}', '${bDir}', '${bPhone}', ${adminId})`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_BUSINESSES) {
        const bQuery = `INSERT INTO business (nombre, direccion, telefono, "usuarioId") VALUES ${queryValues.join(',')} RETURNING id;`;
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
      const u = generateUserSense('client');
      const fakeDni = `${String(i).padStart(8, '0')}Y`;
      queryValues.push(`('${u.username}', '${u.nombreCompleto.replace(/'/g, "''")}', '${fakeDni}', '${u.email}', '${passwordHash}', '${u.profilePicture}', 'client', '${u.phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_CUSTOMERS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        customerIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} clientes...`);
      }
    }

    console.log(`Generando ${NUM_BOOKINGS} reservas y sus pagos correspondientes...`);
    let bEntityQueryValues = [];
    const statuses = ['pending', 'confirmed', 'paid', 'cancelled'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Mantenimiento'];

    let paymentCount = 0;

    for (let i = 1; i <= NUM_BOOKINGS; i++) {
      let cId = faker.helpers.arrayElement(customerIds);
      let bId = faker.helpers.arrayElement(businessIds);

      const status = faker.helpers.arrayElement(statuses);
      const date = faker.date.recent({ days: 60 }).toISOString().split('T')[0];
      const time = `${faker.number.int({ min: 8, max: 20 }).toString().padStart(2, '0')}:00`;
      const serviceName = faker.helpers.arrayElement(services);

      bEntityQueryValues.push(`('${date}', '${time}', '${status}', ${cId}, ${bId}, '${serviceName}')`);

      if (bEntityQueryValues.length >= CHUNK_SIZE || i === NUM_BOOKINGS) {
        const bQuery = `INSERT INTO appointment (date, time, status, "usuarioId", "businessId", "serviceName") VALUES ${bEntityQueryValues.join(',')} ON CONFLICT DO NOTHING RETURNING id;`;
        const bRes = await client.query(bQuery);
        const insertedBookingIds = bRes.rows.map(r => r.id);

        if (insertedBookingIds.length > 0) {
          const paymentQueryValues = insertedBookingIds.map((bookingId, idx) => {
             // Recuperar el status original insertado en el batch? No lo tenemos fácilmente mapeado por conflict, 
             // pero podemos hacer un random simple o usar un estado basico.
             // Como es stress testing, simplificamos el pago:
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
    console.log(`- Citas: ${NUM_BOOKINGS}`);
    console.log(`- Pagos insertados: ~${paymentCount}`);

  } catch (error) {
    console.error('Error durante el seeding:', error);
  } finally {
    await client.end();
  }
}

run();
