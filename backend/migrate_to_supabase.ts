import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Import all entities
import { Usuario } from './src/usuarios/usuario.entity';
import { Business } from './src/business/business.entity';
import { Customer } from './src/customers/customer.entity';
import { BookingEntity as Booking } from './src/bookings/booking.entity';
import { Appointment } from './src/appointments/appointment.entity';
import { Payment } from './src/payments/payments.entity';

// Load .env
dotenv.config();

const entities = [Usuario, Business, Customer, Booking, Appointment, Payment];

async function migrate() {
  console.log('Iniciando migración de datos...');

  const sqliteDataSource = new DataSource({
    type: 'sqlite',
    database: 'data/database.sqlite',
    entities,
  });

  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('Error: No se ha encontrado DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  const pgDataSource = new DataSource({
    type: 'postgres',
    url: pgUrl,
    entities,
    synchronize: true, // Esto creará las tablas en Supabase
  });

  try {
    console.log('Conectando a SQLite local...');
    await sqliteDataSource.initialize();
    
    console.log('Conectando a Supabase (PostgreSQL)...');
    await pgDataSource.initialize();

    console.log('¡Conexiones establecidas! Iniciando transferencia por tabla...');

    // We must migrate in order of dependencies (or turn off foreign key checks)
    // Business doesn't depend on others
    // Usuario depends on nothing (role based)
    // Customer depends on Business
    // Appointment depends on Business
    // Booking depends on Customer and Appointment
    // Payment depends on Booking
    
    const tablesToMigrate = [
      { name: 'Usuario', entity: Usuario, tableName: 'usuario' },
      { name: 'Business', entity: Business, tableName: 'business' },
      { name: 'Customer', entity: Customer, tableName: 'customer' },
      { name: 'Appointment', entity: Appointment, tableName: 'appointment' },
      { name: 'Booking', entity: Booking, tableName: 'booking_entity' },
      { name: 'Payment', entity: Payment, tableName: 'payment' },
    ];

    // Limpiar base de datos destino primero para evitar duplicados
    console.log('Limpiando base de datos Postgres...');
    for (const table of [...tablesToMigrate].reverse()) {
      try {
        await pgDataSource.query(`TRUNCATE TABLE "${table.entity.name.toLowerCase()}" CASCADE`);
      } catch(e) {
        // Ignorar si la tabla no existe
      }
      try {
        await pgDataSource.query(`TRUNCATE TABLE "${table.name.toLowerCase()}" CASCADE`);
      } catch(e) {}
      try {
        await pgDataSource.query(`TRUNCATE TABLE "usuarios" CASCADE`);
      } catch(e) {}
    }

    // Desactivar comprobación de foreign keys temporalmente
    await pgDataSource.query('SET session_replication_role = replica;');

    for (const table of tablesToMigrate) {
      console.log(`\nMigrando tabla: ${table.name}`);
      const sqliteRepo = sqliteDataSource.getRepository(table.entity);
      
      const metadata = sqliteDataSource.getMetadata(table.entity);
      const columnNames = metadata.columns.map(col => col.propertyName);
      
      const rows = await sqliteRepo.find({
        select: columnNames as any,
        withDeleted: true
      });
      console.log(`Encontrados ${rows.length} registros en SQLite.`);

      if (rows.length > 0) {
        try {
          await pgDataSource.createQueryBuilder()
            .insert()
            .into(table.entity)
            .values(rows)
            .execute();
          console.log(`Se han insertado ${rows.length} registros en Supabase.`);
        } catch (err) {
          console.error(`Error al insertar en ${table.name}:`, err.message);
        }
      }
    }

    // Reactivar comprobación de foreign keys
    await pgDataSource.query('SET session_replication_role = DEFAULT;');

    console.log('\n¡Migración completada con éxito!');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    if (sqliteDataSource.isInitialized) await sqliteDataSource.destroy();
    if (pgDataSource.isInitialized) await pgDataSource.destroy();
  }
}

migrate();
