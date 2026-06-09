const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

const NUM_ADMINS = 10;
const NUM_CUSTOMERS = 55;
const BOOKINGS_PER_BUSINESS = 15; // Un buen numero para que se vea lleno a lo largo del mes

function generateUserSense(role) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nombreCompleto = `${firstName} ${lastName}`;
  // El username sera el nombre sin espacios en minuscula
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
  const email = `${username}@${role === 'host' ? 'anfitrion' : 'huesped'}.com`;
  const phone = faker.phone.number('+34 ### ### ###');
  const profilePicture = faker.image.avatar();
  
  return { nombreCompleto, username, email, phone, profilePicture };
}

async function run() {
  console.log('Iniciando generador de datos inteligente (DEV)...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Conectado a la base de datos DEV.');
    
    console.log('Limpiando base de datos (excepto root)...');
    await client.query('TRUNCATE TABLE payment, booking, property CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} anfitriones (hosts)...`);
    const adminIds = [];
    let adminCredentials = [];
    
    for (let i = 1; i <= NUM_ADMINS; i++) {
      const u = generateUserSense('host');
      if (i === 1) {
         // Garantizamos un admin facil de loguear
         u.email = 'anfitrion1@dev.com';
         u.username = 'anfitrion1';
         adminCredentials.push(u.email);
      }
      const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;`;
      const values = [u.username, u.nombreCompleto, `${faker.string.numeric(8)}X`, u.email, passwordHash, u.profilePicture, 'host', u.phone];
      const res = await client.query(query, values);
      adminIds.push(res.rows[0].id);
    }

    console.log(`Generando Propiedades (1 a 10 por anfitrión)...`);
    const businessIds = [];
    for (const adminId of adminIds) {
      const numBiz = faker.number.int({ min: 1, max: 10 });
      for (let j = 0; j < numBiz; j++) {
        const bName = faker.location.streetAddress() + ' Apartment';
        const bDir = faker.location.streetAddress();
        const bPhone = faker.phone.number('+34 ### ### ###');
        const desc = faker.lorem.paragraph();
        const price = faker.number.int({ min: 40, max: 300 });
        const maxGuests = faker.number.int({ min: 1, max: 8 });
        const amenities = JSON.stringify(['Wifi', 'Cocina', 'TV', 'Aire acondicionado']);
        const images = JSON.stringify([faker.image.urlLoremFlickr({ category: 'apartment' })]);
        
        const query = `INSERT INTO property (nombre, direccion, telefono, "usuarioId", description, "pricePerNight", "maxGuests", amenities, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`;
        const res = await client.query(query, [bName, bDir, bPhone, adminId, desc, price, maxGuests, amenities, images]);
        businessIds.push(res.rows[0].id);
      }
    }

    console.log(`Generando ${NUM_CUSTOMERS} huéspedes...`);
    const customerIds = [];
    let customerCredentials = [];
    
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      const u = generateUserSense('guest');
      if (i === 1) {
         u.email = 'huesped1@dev.com';
         u.username = 'huesped1';
         customerCredentials.push(u.email);
      }
      const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;`;
      const values = [u.username, u.nombreCompleto, `${faker.string.numeric(8)}Y`, u.email, passwordHash, u.profilePicture, 'guest', u.phone];
      const res = await client.query(query, values);
      customerIds.push(res.rows[0].id);
    }

    console.log(`Generando reservas de estancias a lo largo del mes en curso...`);
    const statuses = ['pending', 'confirmed', 'modified', 'cancelled'];
    
    let totalBookings = 0;
    let bEntityQueryValues = [];
    let bIdsCount = 0;
    
    for (const bId of businessIds) {
      for (let j = 0; j < BOOKINGS_PER_BUSINESS; j++) {
        const cId = faker.helpers.arrayElement(customerIds);
        const status = faker.helpers.arrayElement(statuses);
        
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const randomDay = faker.number.int({ min: 1, max: daysInMonth - 3 });
        const duration = faker.number.int({ min: 1, max: 7 });
        
        const checkInDate = new Date(now.getFullYear(), now.getMonth(), randomDay).toISOString().split('T')[0];
        const checkOutDate = new Date(now.getFullYear(), now.getMonth(), randomDay + duration).toISOString().split('T')[0];
        
        bEntityQueryValues.push(`('${checkInDate}', '${checkOutDate}', '${status}', ${cId}, ${bId})`);
        totalBookings++;
        bIdsCount++;

        if (bEntityQueryValues.length >= 1000 || (bId === businessIds[businessIds.length - 1] && j === BOOKINGS_PER_BUSINESS - 1)) {
          const bQuery = `INSERT INTO booking ("checkInDate", "checkOutDate", status, "usuarioId", "propertyId") VALUES ${bEntityQueryValues.join(',')} RETURNING id;`;
          const bRes = await client.query(bQuery);
          
          if (bRes.rows.length > 0) {
            const paymentQueryValues = bRes.rows.map((row, idx) => {
              const pStatus = faker.helpers.arrayElement(['pagado', 'pendiente']);
              const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'transferencia']);
              const amount = faker.number.int({ min: 100, max: 1500 });
              return `('${checkInDate}', '${pStatus}', '${pType}', ${amount}, ${row.id})`;
            });
            await client.query(`INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`);
          }
          bEntityQueryValues = [];
        }
      }
    }

    console.log(`\n✅ ¡Base de datos rellenada con éxito y mucho sentido!`);
    console.log(`📊 ESTADÍSTICAS:`);
    console.log(`- Anfitriones: ${adminIds.length}`);
    console.log(`- Propiedades creadas: ${businessIds.length}`);
    console.log(`- Huéspedes: ${customerIds.length}`);
    console.log(`- Reservas vacacionales creadas este mes: ${totalBookings}`);
    console.log(`\n🔑 CREDENCIALES PREPARADAS (Contraseña siempre '1234'):`);
    console.log(`👉 Anfitrión: ${adminCredentials[0]}`);
    console.log(`👉 Huésped: ${customerCredentials[0]}`);

  } catch (error) {
    console.error('Error durante el seeding DEV:', error);
  } finally {
    await client.end();
  }
}
run();
