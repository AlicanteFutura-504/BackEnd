const { Client } = require('pg');

const connectionString = 'postgresql://postgres.ozdyjsnedsdfngyfrueu:FwQnzpvgeCZVlQ1f@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkData() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    console.log("--- Usuarios ---");
    let res = await client.query('SELECT id, email FROM "usuarios" LIMIT 5');
    console.table(res.rows);

    console.log("--- Business ---");
    res = await client.query('SELECT * FROM "business" LIMIT 2');
    console.log(res.rows);

    console.log("--- Customers ---");
    res = await client.query('SELECT * FROM "customers" LIMIT 2');
    console.log(res.rows);

    console.log("--- Booking ---");
    res = await client.query('SELECT * FROM "booking_entity" LIMIT 2');
    console.log(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkData();
