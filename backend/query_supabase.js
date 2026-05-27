const { Client } = require('pg');

const connectionString = 'postgresql://postgres.ozdyjsnedsdfngyfrueu:FwQnzpvgeCZVlQ1f@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkDatabase() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const tables = ['booking_entity', 'usuarios', 'business', 'customers', 'appointment', 'payment'];
    for (const table of tables) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`- ${table}: ${countRes.rows[0].count} rows`);
      } catch(e) {
        console.log(`- ${table}: ERROR - ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkDatabase();
