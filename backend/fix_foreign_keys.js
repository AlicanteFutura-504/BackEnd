const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    // Disable foreign key checks for the session
    await client.query('SET session_replication_role = replica;');

    // --- BUSINESS ---
    console.log('Fixing Business...');
    await client.query('UPDATE business SET "usuarioId" = "usuarioId" + 32, "businessUserId" = "businessUserId" + 32;');

    // --- CUSTOMERS ---
    console.log('Fixing Customers...');
    await client.query(`
      UPDATE customers 
      SET "businessId" = CASE 
        WHEN "businessId" = 1 THEN 21
        WHEN "businessId" = 3 THEN 22
        WHEN "businessId" = 4 THEN 23
        WHEN "businessId" = 5 THEN 24
        WHEN "businessId" = 7 THEN 25
        ELSE "businessId"
      END
    `);
    // update usuarioId if exists (I will do a dynamic check just in case)
    const custCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name='usuarioId'`);
    if (custCols.rows.length > 0) {
      await client.query('UPDATE customers SET "usuarioId" = "usuarioId" + 32;');
    }

    // --- APPOINTMENTS ---
    console.log('Fixing Appointments...');
    await client.query('UPDATE appointment SET "customerId" = "customerId" + 27;');
    await client.query(`
      UPDATE appointment 
      SET "businessId" = CASE 
        WHEN "businessId" = 1 THEN 21
        WHEN "businessId" = 3 THEN 22
        WHEN "businessId" = 4 THEN 23
        WHEN "businessId" = 5 THEN 24
        WHEN "businessId" = 7 THEN 25
        ELSE "businessId"
      END
    `);

    // --- BOOKING_ENTITY ---
    console.log('Fixing Bookings...');
    await client.query('UPDATE booking_entity SET "customerId" = "customerId" + 27;');
    await client.query(`
      UPDATE booking_entity 
      SET "businessId" = CASE 
        WHEN "businessId" = 1 THEN 21
        WHEN "businessId" = 3 THEN 22
        WHEN "businessId" = 4 THEN 23
        WHEN "businessId" = 5 THEN 24
        WHEN "businessId" = 7 THEN 25
        ELSE "businessId"
      END
    `);

    // --- PAYMENTS ---
    console.log('Fixing Payments...');
    await client.query('UPDATE payment SET "customerId" = "customerId" + 27;');
    await client.query(`
      UPDATE payment 
      SET "businessId" = CASE 
        WHEN "businessId" = 1 THEN 21
        WHEN "businessId" = 3 THEN 22
        WHEN "businessId" = 4 THEN 23
        WHEN "businessId" = 5 THEN 24
        WHEN "businessId" = 7 THEN 25
        ELSE "businessId"
      END
    `);

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');
    console.log('Done!');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

fix();
