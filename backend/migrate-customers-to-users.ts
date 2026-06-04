import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CustomersService } from './src/customers/customers.service';
import { UsuariosService } from './src/usuarios/usuarios.service';
import { UserRole } from './src/usuarios/usuario.entity';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { BookingEntity } from './src/bookings/booking.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const customersService = app.get(CustomersService);
  const usuariosService = app.get(UsuariosService);
  const bookingsRepository: Repository<BookingEntity> = app.get(getRepositoryToken(BookingEntity));

  console.log('Iniciando migración de Customers a Usuarios...');

  const { data: customers } = await customersService.findAll({ role: 'superadmin', userId: 1, username: 'admin' } as any, 1, 100000);
  console.log(`Se encontraron ${customers.length} customers.`);

  for (const customer of customers) {
    try {
      let usuario = await usuariosService.findByEmail(customer.email);

      if (!usuario) {
        const hash = await bcrypt.hash('1234', 10);
        usuario = await usuariosService.create({
          username: customer.email.split('@')[0] + '_' + customer.id,
          email: customer.email,
          nombreCompleto: `${customer.name} ${customer.surname || ''}`.trim(),
          phone: customer.phone,
          contrasena: hash,
          role: UserRole.CLIENT,
        });
        console.log(`Creado usuario: ${usuario.email} con ID ${usuario.id}`);
      }

      // El campo antiguo customerId en bookings.entity ha sido renombrado a usuarioId en el código.
      // Así que simplemente actualizamos usuarioId = usuario.id DONDE usuarioId era el antiguo customer.id
      // Ojo: Esto asume que aún no hay solapamiento de IDs, lo ideal es hacer esto ANTES de solapar IDs
      await bookingsRepository.query(
        `UPDATE booking_entity SET "usuarioId" = $1 WHERE "usuarioId" = $2`, 
        [usuario.id, customer.id]
      );
    } catch (error) {
      console.error(`Error al migrar customer ${customer.email}:`, error);
    }
  }

  console.log('Migración completada.');
  await app.close();
}

bootstrap();
