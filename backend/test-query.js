require('dotenv').config();
const { DataSource } = require('typeorm');
const BookingEntity = require('./src/bookings/booking.entity').BookingEntity;

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [BookingEntity],
  synchronize: false,
});

(async () => {
  await AppDataSource.initialize();
  
  try {
    const res1 = await AppDataSource.getRepository(BookingEntity).createQueryBuilder('bk')
      .select('COUNT(DISTINCT bk.customerId)', 'count')
      .getRawOne();
    console.log('Query 1 success:', res1);
  } catch (err) {
    console.error('Query 1 error:', err.message);
  }

  try {
    const res2 = await AppDataSource.getRepository(BookingEntity).createQueryBuilder('bk')
      .select('COUNT(DISTINCT "bk"."customerId")', 'count')
      .getRawOne();
    console.log('Query 2 success:', res2);
  } catch (err) {
    console.error('Query 2 error:', err.message);
  }

  await AppDataSource.destroy();
})();
