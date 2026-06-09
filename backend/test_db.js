const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const pCount = await client.query('SELECT count(*) FROM payment;');
    console.log('TOTAL PAYMENTS IN DB:', pCount.rows[0].count);
    const pFirst = await client.query('SELECT * FROM payment LIMIT 1;');
    console.log('FIRST PAYMENT IN DB:', pFirst.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
