const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

const NUM_ADMINS = 10;
const NUM_CUSTOMERS = 55;
const BOOKINGS_PER_BUSINESS = 5;

async function run() {
  console.log('Iniciando generador de datos para Entorno de Desarrollo (DEV)...');
  
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
    await client.query('TRUNCATE TABLE payment, appointment, business CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} empresarios (admins)...`);
    const adminIds = [];
    let queryValues = [];
    for (let i = 1; i <= NUM_ADMINS; i++) {
      const email = `empresario${i}@dev.com`;
      queryValues.push(`('${email}', '${faker.person.fullName()}', '${faker.helpers.replaceSymbolWithNumber('########')}X', '${email}', '${passwordHash}', '${faker.image.avatar()}', 'admin', '${faker.phone.number()}')`);
    }
    const adminRes = await client.query(`INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`);
    adminIds.push(...adminRes.rows.map(r => r.id));

    console.log(`Generando Negocios (1 a 10 por empresario)...`);
    const businessIds = [];
    queryValues = [];
    for (const adminId of adminIds) {
      const numBiz = faker.number.int({ min: 1, max: 10 });
      for (let j = 0; j < numBiz; j++) {
        queryValues.push(`('${faker.company.name()}', '${faker.location.streetAddress()}', '${faker.phone.number()}', ${adminId})`);
      }
    }
    const bizRes = await client.query(`INSERT INTO business (nombre, direccion, telefono, "usuarioId") VALUES ${queryValues.join(',')} RETURNING id;`);
    businessIds.push(...bizRes.rows.map(r => r.id));

    console.log(`Generando ${NUM_CUSTOMERS} clientes...`);
    const customerIds = [];
    queryValues = [];
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      const email = `cliente${i}@dev.com`;
      queryValues.push(`('${email}', '${faker.person.fullName()}', '${faker.helpers.replaceSymbolWithNumber('########')}Y', '${email}', '${passwordHash}', '${faker.image.avatar()}', 'client', '${faker.phone.number()}')`);
    }
    const custRes = await client.query(`INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) VALUES ${queryValues.join(',')} RETURNING id;`);
    customerIds.push(...custRes.rows.map(r => r.id));

    console.log(`Generando ${BOOKINGS_PER_BUSINESS} reservas por negocio...`);
    const statuses = ['pending', 'confirmed', 'paid', 'cancelled'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Sesión de fisioterapia', 'Masaje relajante', 'Entrenamiento personal'];
    let bEntityQueryValues = [];
    let totalBookings = 0;
    
    for (const bId of businessIds) {
      for (let j = 0; j < BOOKINGS_PER_BUSINESS; j++) {
        const cId = faker.helpers.arrayElement(customerIds);
        const status = faker.helpers.arrayElement(statuses);
        const date = faker.date.recent({ days: 30 }).toISOString().split('T')[0];
        const time = `${faker.number.int({ min: 8, max: 20 })}:00`;
        const serviceName = faker.helpers.arrayElement(services);
        bEntityQueryValues.push(`('${date}', '${time}', '${status}', ${cId}, ${bId}, '${serviceName}')`);
        totalBookings++;
      }
    }

    const bQuery = `INSERT INTO appointment (date, time, status, "usuarioId", "businessId", "serviceName") VALUES ${bEntityQueryValues.join(',')} ON CONFLICT DO NOTHING RETURNING id;`;
    const bRes = await client.query(bQuery);
    const insertedBookingIds = bRes.rows.map(r => r.id);

    if (insertedBookingIds.length > 0) {
      console.log(`Generando pagos para las reservas...`);
      const paymentQueryValues = insertedBookingIds.map(bookingId => {
         const pStatus = faker.helpers.arrayElement(['pagado', 'pendiente']);
         const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'bizum']);
         const amount = faker.number.int({ min: 10, max: 200 });
         const pDate = faker.date.recent({ days: 30 }).toISOString().split('T')[0];
         return `('${pDate}', '${pStatus}', '${pType}', ${amount}, ${bookingId})`;
      });
      const pQuery = `INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${paymentQueryValues.join(',')};`;
      await client.query(pQuery);
    }

    console.log(`\n¡Datos Ligeros (DEV) generados con éxito!`);
    console.log(`- Empresarios: ${adminIds.length}`);
    console.log(`- Negocios creados: ${businessIds.length}`);
    console.log(`- Clientes: ${customerIds.length}`);
    console.log(`- Reservas totales: ${insertedBookingIds.length} (5 por negocio)`);
    console.log(`\nCredenciales útiles para probar:`);
    console.log(`👉 Empresario: empresario1@dev.com (Pass: 1234)`);
    console.log(`👉 Cliente: cliente1@dev.com (Pass: 1234)`);

  } catch (error) {
    console.error('Error durante el seeding DEV:', error);
  } finally {
    await client.end();
  }
}
run();
