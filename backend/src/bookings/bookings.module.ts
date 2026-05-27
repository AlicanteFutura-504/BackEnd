import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './booking.entity';
import { Business } from '../business/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, Business])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
