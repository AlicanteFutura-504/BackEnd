const { Client } = require('pg');

const connectionString = 'postgresql://postgres.ozdyjsnedsdfngyfrueu:FwQnzpvgeCZVlQ1f@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkData() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    console.log("--- Payments ---");
    let res = await client.query('SELECT * FROM "payment" LIMIT 2');
    console.log(res.rows);

    console.log("--- Appointments ---");
    res = await client.query('SELECT * FROM "appointment" LIMIT 2');
    console.log(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkData();
