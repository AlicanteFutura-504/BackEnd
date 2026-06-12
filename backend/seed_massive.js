const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

// --- CONFIGURATION MASSIVE ---
const NUM_ADMINS = 10;
const NUM_BUSINESSES = 50;
const NUM_CUSTOMERS = 1000;
const BOOKINGS_PER_BUSINESS = 300;
const CHUNK_SIZE = 2500;
// -----------------------------

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
  console.log('Iniciando script de Seeding (MASSIVE)...');
  
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

    const spainCities = [
      { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
      { name: 'Valencia', lat: 39.4699, lng: -0.3774 },
      { name: 'Alicante', lat: 38.3452, lng: -0.4810 },
      { name: 'Sevilla', lat: 37.3891, lng: -5.9845 },
      { name: 'Málaga', lat: 36.7213, lng: -4.4214 }
    ];

    for (let i = 1; i <= NUM_BUSINESSES; i++) {
      const adminId = faker.helpers.arrayElement(adminIds);
      const bName = (faker.location.streetAddress() + ' Apartment').replace(/'/g, "''");
      const loc = faker.helpers.arrayElement(spainCities);
      const city = loc.name;
      const latitude = loc.lat + (Math.random() - 0.5) * 0.05;
      const longitude = loc.lng + (Math.random() - 0.5) * 0.05;
      const address = faker.location.streetAddress().replace(/'/g, "''");
      const bPhone = faker.phone.number({ style: 'national' });
      const desc = faker.lorem.paragraph().replace(/'/g, "''");
      const price = faker.number.int({ min: 40, max: 300 });
      const maxGuests = faker.number.int({ min: 1, max: 8 });
      const amenities = JSON.stringify(['Wifi', 'Cocina', 'TV', 'Aire acondicionado']).replace(/'/g, "''");
      const images = JSON.stringify([faker.image.urlLoremFlickr({ category: 'apartment' })]).replace(/'/g, "''");
      
      queryValues.push(`('${bName}', '${city}', '${address}', '${bPhone}', ${adminId}, '${desc}', ${price}, ${maxGuests}, '${amenities}', '${images}', ${latitude}, ${longitude})`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_BUSINESSES) {
        const bQuery = `INSERT INTO property (nombre, city, address, telefono, "usuarioId", description, "pricePerNight", "maxGuests", amenities, images, latitude, longitude) VALUES ${queryValues.join(',')} RETURNING id, "usuarioId";`;
        const bRes = await client.query(bQuery);
        businessIds.push(...bRes.rows.map(r => r.id));
        bRes.rows.forEach(r => { propertyHosts[r.id] = r.usuarioId; });
        queryValues = [];
      }
    }

    console.log(`Generando ${NUM_CUSTOMERS} clientes...`);
    let customerIds = [];
    let customerBiases = {}; // ID -> 'promoter' | 'detractor' | 'neutral'
    queryValues = [];
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      const u = generateUserSense('guest');
      let bias = 'neutral';
      
      if (i === 1) {
         u.email = 'huesped1@dev.com';
         u.username = 'huesped1';
         bias = 'promoter'; // El 1 siempre es promotor
      } else if (i % 3 === 0) {
         bias = 'promoter';
      } else if (i % 5 === 0) {
         bias = 'detractor';
      }

      const fakeDni = `${String(i).padStart(8, '0')}Y`;
      queryValues.push(`('${u.username}', '${u.nombreCompleto.replace(/'/g, "''")}', '${fakeDni}', '${u.email}', '${passwordHash}', '${u.profilePicture}', 'guest', '${u.phone}')`);
      
      if (queryValues.length >= CHUNK_SIZE || i === NUM_CUSTOMERS) {
        const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`;
        const res = await client.query(query);
        res.rows.forEach((r, idx) => {
          customerIds.push(r.id);
          const originalI = i - res.rows.length + 1 + idx;
          let rBias = 'neutral';
          if (originalI === 1 || originalI % 3 === 0) rBias = 'promoter';
          else if (originalI % 5 === 0) rBias = 'detractor';
          customerBiases[r.id] = rBias;
        });
        queryValues = [];
      }
    }

    console.log(`Generando Reservas, Pagos, Reseñas y GuestRatings...`);
    let bEntityQueryValues = [];
    const statuses = ['pending', 'confirmed', 'modified', 'cancelled', 'terminada'];

    for (const bId of businessIds) {
      let currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() - 6); // 6 meses atrás para massive
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

        const cancelReason = status === 'cancelled' ? faker.helpers.arrayElement(['Cambio de planes', 'Enfermedad', 'Problemas de transporte']) : null;
        const cancelReasonStr = cancelReason ? `'${cancelReason}'` : 'NULL';

        bEntityQueryValues.push({ checkInDate, checkOutDate, status, cId, bId, cancelReasonStr });

        if (bEntityQueryValues.length >= CHUNK_SIZE || (bId === businessIds[businessIds.length - 1] && j === BOOKINGS_PER_BUSINESS - 1)) {
          const valStrings = bEntityQueryValues.map(b => `('${b.checkInDate}', '${b.checkOutDate}', '${b.status}', ${b.cId}, ${b.bId}, ${b.cancelReasonStr})`);
          const bQuery = `INSERT INTO booking ("checkInDate", "checkOutDate", status, "usuarioId", "propertyId", "cancelReason") VALUES ${valStrings.join(',')} RETURNING id, "usuarioId", "propertyId", status;`;
          const bRes = await client.query(bQuery);
          
          if (bRes.rows.length > 0) {
            const paymentQueryValues = bRes.rows.map((row) => {
               const pStatus = (row.status === 'confirmed' || row.status === 'terminada') ? 'pagado' : faker.helpers.arrayElement(['pagado', 'pendiente']);
               const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'transferencia']);
               const amount = faker.number.int({ min: 100, max: 1500 });
               return `(CURRENT_DATE, '${pStatus}', '${pType}', ${amount}, ${row.id})`;
            });
            await client.query(`INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`);

            let reviewValues = [];
            let guestRatingValues = [];
            for (const row of bRes.rows) {
               if (row.status === 'confirmed') { 
                  const bias = customerBiases[row.usuarioId] || 'neutral';
                  
                  if (Math.random() < 0.8) {
                     let score = faker.number.int({ min: 1, max: 5 });
                     if (bias === 'promoter') score = faker.number.int({ min: 4, max: 5 });
                     if (bias === 'detractor') score = faker.number.int({ min: 1, max: 2 });
                     
                     const comment = faker.lorem.sentence().substring(0, 300).replace(/'/g, "''");
                     const hasReply = Math.random() < 0.3;
                     const hostReply = hasReply ? `'${faker.lorem.sentence().substring(0, 300).replace(/'/g, "''")}'` : 'NULL';
                     reviewValues.push(`(${row.propertyId}, ${row.usuarioId}, ${score}, '${comment}', ${hostReply})`);
                  }
                  if (Math.random() < 0.8) {
                     let score = faker.number.int({ min: 1, max: 5 });
                     if (bias === 'promoter') score = faker.number.int({ min: 4, max: 5 });
                     if (bias === 'detractor') score = faker.number.int({ min: 1, max: 2 });

                     const hostId = propertyHosts[row.propertyId];
                     guestRatingValues.push(`(${row.usuarioId}, ${hostId}, ${score})`);
                  }
               }
            }
            let notificationValues = [];
            for (const row of bRes.rows) {
               const hostId = propertyHosts[row.propertyId];
               notificationValues.push(`(${row.usuarioId}, 'Reserva generada', 'Tu reserva ha sido registrada con estado ${row.status}.', 'booking_${row.status}_guest', ${row.id}, NULL, '/mis-reservas')`);
               notificationValues.push(`(${hostId}, 'Interacción de reserva', 'Reserva con estado ${row.status} registrada.', 'booking_${row.status}_host', ${row.id}, NULL, '/properties')`);
            }

            if (reviewValues.length > 0) {
               const rRes = await client.query(`INSERT INTO review ("propertyId", "guestId", score, comment, "hostReply") VALUES ${reviewValues.join(',')} RETURNING id, "propertyId";`);
               for (const rRow of rRes.rows) {
                 const hostId = propertyHosts[rRow.propertyId];
                 notificationValues.push(`(${hostId}, 'Nueva reseña', 'Has recibido una nueva reseña de tu propiedad.', 'review_created', NULL, ${rRow.id}, '/properties')`);
               }
            }
            
            if (guestRatingValues.length > 0) {
               await client.query(`INSERT INTO guest_rating ("guestId", "hostId", score) VALUES ${guestRatingValues.join(',')};`);
            }

            if (notificationValues.length > 0) {
               await client.query(`INSERT INTO notifications ("userId", title, message, type, "bookingId", "reviewId", link) VALUES ${notificationValues.join(',')};`);
            }
          }
          bEntityQueryValues = [];
        }
      }
    }

    console.log(`\n¡Seeding MASSIVE completado con éxito!`);
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
