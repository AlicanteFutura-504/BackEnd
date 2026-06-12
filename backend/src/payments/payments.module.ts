import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payments.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Property } from '../property/property.entity';
import { BookingEntity } from '../bookings/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Property, BookingEntity])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
