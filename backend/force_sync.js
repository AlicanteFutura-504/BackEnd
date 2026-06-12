const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`ALTER TABLE property ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7)`);
    await client.query(`ALTER TABLE property ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7)`);
    await client.query(`ALTER TABLE booking ADD COLUMN IF NOT EXISTS "cancelReason" VARCHAR`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "bookingId" INTEGER`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "reviewId" INTEGER`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR`);
    console.log("DB altered successfully");
  } catch (e) { console.error(e) }
  await client.end();
}
run();
