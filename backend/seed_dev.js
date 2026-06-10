const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

// --- CONFIGURATION DEV ---
const NUM_ADMINS = 10;
const NUM_BUSINESSES = 25;
const NUM_CUSTOMERS = 55;
const BOOKINGS_PER_BUSINESS = 15;
const CHUNK_SIZE = 2500;
// -------------------------

function generateUserSense(role) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nombreCompleto = `${firstName} ${lastName}`;
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '') + '_' + faker.string.alphanumeric(4);
  const email = `${username}@${role === 'host' ? 'anfitrion' : 'huesped'}.com`;
  const phone = faker.phone.number({ style: 'national' });
  const profilePicture = faker.image.avatar();
  
  return { nombreCompleto, username, email, phone, profilePicture };
}

async function run() {
  console.log('Iniciando script de Seeding (DEV)...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Conectado a la base de datos.');

  try {
    console.log('Limpiando base de datos (excepto root)...');
    await client.query('DROP TABLE IF EXISTS reviews CASCADE;');
    await client.query('TRUNCATE TABLE guest_rating, review, payment, booking, property CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} anfitriones...`);
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
      }
    }

    console.log(`Generando ${NUM_BUSINESSES} propiedades...`);
    let businessIds = [];
    let propertyHosts = {}; 
    queryValues = [];
    for (let i = 1; i <= NUM_BUSINESSES; i++) {
      const adminId = faker.helpers.arrayElement(adminIds);
      const bName = (faker.location.streetAddress() + ' Apartment').replace(/'/g, "''");
      const city = faker.location.city().replace(/'/g, "''");
      const address = faker.location.streetAddress().replace(/'/g, "''");
      const bPhone = faker.phone.number({ style: 'national' });
      const desc = faker.lorem.paragraph().replace(/'/g, "''");
      const price = faker.number.int({ min: 40, max: 300 });
      const maxGuests = faker.number.int({ min: 1, max: 8 });
      const amenities = JSON.stringify(['Wifi', 'Cocina', 'TV', 'Aire acondicionado']).replace(/'/g, "''");
      const images = JSON.stringify([faker.image.urlLoremFlickr({ category: 'apartment' })]).replace(/'/g, "''");
      
      queryValues.push(`('${bName}', '${city}', '${address}', '${bPhone}', ${adminId}, '${desc}', ${price}, ${maxGuests}, '${amenities}', '${images}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_BUSINESSES) {
        const bQuery = `INSERT INTO property (nombre, city, address, telefono, "usuarioId", description, "pricePerNight", "maxGuests", amenities, images) VALUES ${queryValues.join(',')} RETURNING id, "usuarioId";`;
        const bRes = await client.query(bQuery);
        businessIds.push(...bRes.rows.map(r => r.id));
        bRes.rows.forEach(r => { propertyHosts[r.id] = r.usuarioId; });
        queryValues = [];
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
      }
    }

    console.log(`Generando Reservas, Pagos, Reseñas y GuestRatings...`);
    let bEntityQueryValues = [];
    const statuses = ['pending', 'confirmed', 'modified', 'cancelled'];

    for (const bId of businessIds) {
      let currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() - 2); // 2 meses atrás para dev
      currentDate.setDate(1);

      for (let j = 0; j < BOOKINGS_PER_BUSINESS; j++) {
        let cId = faker.helpers.arrayElement(customerIds);
        const status = faker.helpers.arrayElement(statuses);
        
        const gap = faker.number.int({ min: 0, max: 2 });
        const duration = faker.number.int({ min: 1, max: 5 });

        currentDate.setDate(currentDate.getDate() + gap);
        const checkInDate = currentDate.toISOString().split('T')[0];
        
        currentDate.setDate(currentDate.getDate() + duration);
        const checkOutDate = currentDate.toISOString().split('T')[0];

        bEntityQueryValues.push({ checkInDate, checkOutDate, status, cId, bId });

        if (bEntityQueryValues.length >= CHUNK_SIZE || (bId === businessIds[businessIds.length - 1] && j === BOOKINGS_PER_BUSINESS - 1)) {
          const valStrings = bEntityQueryValues.map(b => `('${b.checkInDate}', '${b.checkOutDate}', '${b.status}', ${b.cId}, ${b.bId})`);
          const bQuery = `INSERT INTO booking ("checkInDate", "checkOutDate", status, "usuarioId", "propertyId") VALUES ${valStrings.join(',')} RETURNING id, "usuarioId", "propertyId", status;`;
          const bRes = await client.query(bQuery);
          
          if (bRes.rows.length > 0) {
            const paymentQueryValues = bRes.rows.map((row) => {
               const pStatus = row.status === 'confirmed' ? 'pagado' : faker.helpers.arrayElement(['pagado', 'pendiente']);
               const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'transferencia']);
               const amount = faker.number.int({ min: 100, max: 1500 });
               return `(CURRENT_DATE, '${pStatus}', '${pType}', ${amount}, ${row.id})`;
            });
            await client.query(`INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`);

            let reviewValues = [];
            let guestRatingValues = [];
            for (const row of bRes.rows) {
               if (row.status === 'confirmed') { 
                  if (Math.random() < 0.8) {
                     const score = faker.number.int({ min: 1, max: 5 });
                     const comment = faker.lorem.sentence().substring(0, 300).replace(/'/g, "''");
                     reviewValues.push(`(${row.propertyId}, ${row.usuarioId}, ${score}, '${comment}')`);
                  }
                  if (Math.random() < 0.8) {
                     const score = faker.number.int({ min: 1, max: 5 });
                     const hostId = propertyHosts[row.propertyId];
                     guestRatingValues.push(`(${row.usuarioId}, ${hostId}, ${score})`);
                  }
               }
            }
            if (reviewValues.length > 0) {
               await client.query(`INSERT INTO review ("propertyId", "guestId", score, comment) VALUES ${reviewValues.join(',')};`);
            }
            if (guestRatingValues.length > 0) {
               await client.query(`INSERT INTO guest_rating ("guestId", "hostId", score) VALUES ${guestRatingValues.join(',')};`);
            }
          }
          bEntityQueryValues = [];
        }
      }
    }

    console.log(`\n¡Seeding DEV completado con éxito!`);
    console.log(`🔑 CREDENCIALES (Contraseña siempre '1234'):`);
    console.log(`👉 Anfitrión: anfitrion1@dev.com`);
    console.log(`👉 Huésped: huesped1@dev.com`);

  } catch (error) {
    console.error('Error durante el seeding:', error);
  } finally {
    await client.end();
  }
}

run();
