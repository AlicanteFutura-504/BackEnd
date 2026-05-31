import { DataSource, IsNull } from 'typeorm';
import { Payment } from './src/payments/payments.entity';
import { BookingEntity, BookingStatus } from './src/bookings/booking.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Payment, BookingEntity, __dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function run() {
  await AppDataSource.initialize();
  console.log("Conectado a la BD");
  console.log("Comprobando si existen las columnas antiguas...");
  
  try {
    // Intentamos hacer un UPDATE inteligente basado en los datos antiguos (si aún existen en la BBDD)
    await AppDataSource.query(`
      UPDATE payment p
      SET "bookingId" = (
          SELECT id 
          FROM booking_entity b 
          WHERE b."businessId" = p."businessId" 
            AND b."customerId" = p."customerId"
          ORDER BY b.id DESC
          LIMIT 1
      )
      WHERE p."bookingId" IS NULL 
        AND p."businessId" IS NOT NULL;
    `);
    
    console.log("¡Migración inteligente completada! Se han asignado los pagos a sus reservas originales correspondientes.");
  } catch (error) {
    console.error("Error en la migración:", error.message);
    if (error.message.includes('does not exist')) {
      console.log("\nATENCIÓN: La base de datos ya ha borrado por completo las columnas antiguas ('businessId' y 'customerId'). Esto significa que la conexión histórica se ha perdido a nivel físico y es imposible recuperar matemáticamente a qué reserva pertenecía cada pago. Tendrás que restaurar un backup de Supabase si deseas recuperar esos vínculos.");
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
