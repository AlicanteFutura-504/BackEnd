const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  const users = await client.query('SELECT id, username, email FROM usuarios');
  console.log('--- Usuarios ---');
  console.table(users.rows);



  const businessData = await client.query('SELECT id, nombre, "usuarioId", "businessUserId" FROM business ORDER BY id');
  console.log('\n--- Business ---');
  console.table(businessData.rows);

  const customers = await client.query('SELECT * FROM customers ORDER BY id');
  console.log('\n--- Customers ---');
  console.table(customers.rows);

  const appointments = await client.query('SELECT * FROM appointment ORDER BY id');
  console.log('\n--- Appointments ---');
  console.table(appointments.rows);

  const bookings = await client.query('SELECT * FROM booking_entity ORDER BY id');
  console.log('\n--- Bookings ---');
  console.table(bookings.rows);
  
  const payments = await client.query('SELECT * FROM payment ORDER BY id');
  console.log('\n--- Payments ---');
  console.table(payments.rows);

  await client.end();
}

check();
