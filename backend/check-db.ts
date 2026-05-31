import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
});

async function run() {
  await AppDataSource.initialize();
  const res = await AppDataSource.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'payment';
  `);
  console.log(res);
  process.exit(0);
}
run();
