import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Usuario } from './src/usuarios/usuario.entity';
import { Property } from './src/business/business.entity';
import { BookingEntity as Booking } from './src/bookings/booking.entity';

dotenv.config();

const entities = [Usuario, Property, Booking];

async function verify() {
  const pgDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities,
  });

  await pgDataSource.initialize();
  
  console.log('--- Data in Supabase ---');
  for (const entity of entities) {
    const repo = pgDataSource.getRepository(entity);
    const count = await repo.count();
    console.log(`${entity.name} count: ${count}`);
    if (entity.name === 'Usuario') {
      const users = await repo.find();
      console.log('Users:', users);
    }
    if (entity.name === 'Property') {
      const properties = await repo.find();
      console.log('Properties:', properties);
    }

    if (entity.name === 'BookingEntity') {
        const bookings = await repo.find();
        console.log('Bookings (id, businessId):', bookings);
    }
  }

  await pgDataSource.destroy();
}

verify().catch(console.error);
