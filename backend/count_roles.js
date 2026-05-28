const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.ozdyjsnedsdfngyfrueu:FwQnzpvgeCZVlQ1f@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT role, COUNT(*) FROM usuarios GROUP BY role;');
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
