import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { BusinessModule } from './business/business.module';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BookingsModule } from './bookings/bookings.module';

/**
 * Módulo raíz de la aplicación NestJS.
 * Registra la configuración global, la conexión a base de datos
 * y todos los módulos de dominio.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/database.sqlite',
      autoLoadEntities: true,
      // NUNCA activar synchronize en producción: usar migraciones
      synchronize: false,
    }),
    AppointmentsModule,
    PaymentsModule,
    UsuariosModule,
    BusinessModule,
    CustomersModule,
    AuthModule,
    BookingsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }