import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { BusinessModule } from './business/business.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
      synchronize: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
    }),
    AppointmentsModule,
    PaymentsModule,
    UsuariosModule,
    BusinessModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }