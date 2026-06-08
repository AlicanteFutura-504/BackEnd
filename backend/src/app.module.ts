import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { PaymentsModule } from './payments/payments.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { BusinessModule } from './business/business.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { BookingsModule } from './bookings/bookings.module';

import { DashboardModule } from './dashboard/dashboard.module';
import { MailerModule } from './mailer/mailer.module';

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
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isPostgres = !!process.env.DATABASE_URL;
        return {
          type: isPostgres ? 'postgres' : 'sqlite',
          ...(isPostgres 
            ? { url: process.env.DATABASE_URL }
            : { database: 'data/database.sqlite' }),
          autoLoadEntities: true,
          // NUNCA activar synchronize en producción: usar migraciones
          synchronize: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
        };
      },
    }),
    PaymentsModule,
    UsuariosModule,
    BusinessModule,
    AuthModule,
    BookingsModule,
    DashboardModule,
    PaymentsModule,
    MailerModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }