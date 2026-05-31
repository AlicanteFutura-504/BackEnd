import { DataSource } from 'typeorm';
import { Payment } from './src/payments/payments.entity';
import { BookingEntity } from './src/bookings/booking.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '123',
  database: 'alicante_futura',
  entities: [Payment, BookingEntity, __dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function run() {
  await AppDataSource.initialize();
  
  const paymentRepo = AppDataSource.getRepository(Payment);
  
  const query = paymentRepo.createQueryBuilder('payment')
    .leftJoinAndSelect('payment.booking', 'booking')
    .where('booking.businessId = :bId', { bId: 1 });
    
  try {
    const data = await query.getMany();
    console.log("PAYMENTS FOUND:", data.length);
  } catch (e) {
    console.error("SQL ERROR:", e.message);
  }
  
  process.exit(0);
}

run();
