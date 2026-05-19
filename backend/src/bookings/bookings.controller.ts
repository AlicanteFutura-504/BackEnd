import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './booking.entity';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('business/:businessId')
  findByBusiness(@Param('businessId') businessId: string) {
    return this.bookingsService.findByBusiness(+businessId);
  }

  @Post()
  create(@Body() createBookingDto: Partial<BookingEntity>) {
    return this.bookingsService.create(createBookingDto);
  }
}
