const fs = require('fs');
const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Configuración de Volúmenes (Stress Testing)
const NUM_ADMINS = 10;
const NUM_BUSINESSES = 50;
const NUM_CUSTOMERS = 1000;
const NUM_BOOKINGS = 15000; // Unas 300 reservas por propiedad
const CHUNK_SIZE = 2500; 

function generateUserSense(role) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nombreCompleto = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '') + '_' + faker.string.alphanumeric(4);
  const email = `${username}@${role === 'host' ? 'anfitrion' : 'huesped'}.com`;
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
    await client.query('TRUNCATE TABLE payment, booking, property CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    console.log('Generando hash de contraseña "1234"...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} anfitriones (hosts)...`);
    let adminIds = [];
    let queryValues = [];
    for (let i = 1; i <= NUM_ADMINS; i++) {
      const u = generateUserSense('host');
      if (i === 1) {
         u.email = 'anfitrion1@dev.com';
         u.username = 'anfitrion1';
      }
      const dni = `${String(i).padStart(8, '0')}X`;
      queryValues.push(`('${u.username}', '${u.nombreCompleto.replace(/'/g, "''")}', '${dni}', '${u.email}', '${passwordHash}', '${u.profilePicture}', 'host', '${u.phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_ADMINS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        adminIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} empresarios...`);
      }
    }

    console.log(`Generando ${NUM_BUSINESSES} propiedades...`);
    let businessIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_BUSINESSES; i++) {
      const adminId = faker.helpers.arrayElement(adminIds);
      const bName = (faker.location.streetAddress() + ' Apartment').replace(/'/g, "''");
      const bDir = faker.location.streetAddress().replace(/'/g, "''");
      const bPhone = faker.phone.number('+34 ### ### ###');
      const desc = faker.lorem.paragraph().replace(/'/g, "''");
      const price = faker.number.int({ min: 40, max: 300 });
      const maxGuests = faker.number.int({ min: 1, max: 8 });
      const amenities = JSON.stringify(['Wifi', 'Cocina', 'TV', 'Aire acondicionado']).replace(/'/g, "''");
      const images = JSON.stringify([faker.image.urlLoremFlickr({ category: 'apartment' })]).replace(/'/g, "''");
      
      queryValues.push(`('${bName}', '${bDir}', '${bPhone}', ${adminId}, '${desc}', ${price}, ${maxGuests}, '${amenities}', '${images}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_BUSINESSES) {
        const bQuery = `INSERT INTO property (nombre, direccion, telefono, "usuarioId", description, "pricePerNight", "maxGuests", amenities, images) VALUES ${queryValues.join(',')} RETURNING id;`;
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
      const u = generateUserSense('guest');
      if (i === 1) {
         u.email = 'huesped1@dev.com';
         u.username = 'huesped1';
      }
      const fakeDni = `${String(i).padStart(8, '0')}Y`;
      queryValues.push(`('${u.username}', '${u.nombreCompleto.replace(/'/g, "''")}', '${fakeDni}', '${u.email}', '${passwordHash}', '${u.profilePicture}', 'guest', '${u.phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_CUSTOMERS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        customerIds.push(...res.rows.map(r => r.id));
        queryValues = [];
        console.log(` Insertados ${i} clientes...`);
      }
    }

    console.log(`Generando ${NUM_BOOKINGS} reservas vacacionales y sus pagos correspondientes...`);
    let bEntityQueryValues = [];
    const statuses = ['pending', 'confirmed', 'modified', 'cancelled'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Mantenimiento'];

    let paymentCount = 0;

    for (let i = 1; i <= NUM_BOOKINGS; i++) {
      let cId = faker.helpers.arrayElement(customerIds);
      let bId = faker.helpers.arrayElement(businessIds);

      const status = faker.helpers.arrayElement(statuses);
      
      const checkInDateObj = faker.date.recent({ days: 60 });
      const checkInDate = checkInDateObj.toISOString().split('T')[0];
      const duration = faker.number.int({ min: 1, max: 7 });
      const checkOutDateObj = new Date(checkInDateObj);
      checkOutDateObj.setDate(checkOutDateObj.getDate() + duration);
      const checkOutDate = checkOutDateObj.toISOString().split('T')[0];

      bEntityQueryValues.push(`('${checkInDate}', '${checkOutDate}', '${status}', ${cId}, ${bId})`);

      if (bEntityQueryValues.length >= CHUNK_SIZE || i === NUM_BOOKINGS) {
        const bQuery = `INSERT INTO booking ("checkInDate", "checkOutDate", status, "usuarioId", "propertyId") VALUES ${bEntityQueryValues.join(',')} RETURNING id;`;
        const bRes = await client.query(bQuery);
        const insertedBookingIds = bRes.rows.map(r => r.id);

        if (insertedBookingIds.length > 0) {
          const paymentQueryValues = insertedBookingIds.map((bookingId, idx) => {
             // Recuperar el status original insertado en el batch? No lo tenemos fácilmente mapeado por conflict, 
             // pero podemos hacer un random simple o usar un estado basico.
             // Como es stress testing, simplificamos el pago:
             const pStatus = faker.helpers.arrayElement(['pagado', 'pendiente']);
             const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'transferencia']);
             const amount = faker.number.int({ min: 100, max: 1500 });
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
    console.log(`- Anfitriones: ${NUM_ADMINS}`);
    console.log(`- Propiedades: ${NUM_BUSINESSES}`);
    console.log(`- Huéspedes: ${NUM_CUSTOMERS}`);
    console.log(`- Reservas: ${NUM_BOOKINGS}`);
    console.log(`- Pagos insertados: ~${paymentCount}`);
    console.log(`\n🔑 CREDENCIALES MASIVAS (Contraseña siempre '1234'):`);
    console.log(`👉 Anfitrión: anfitrion1@dev.com (anfitrion1)`);
    console.log(`👉 Huésped: huesped1@dev.com (huesped1)`);

  } catch (error) {
    console.error('Error durante el seeding:', error);
  } finally {
    await client.end();
  }
}

run();
