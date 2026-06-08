import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Property } from '../business/business.entity';
import { BookingEntity } from '../bookings/booking.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Payment } from '../payments/payments.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, BookingEntity, Usuario, Payment])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
