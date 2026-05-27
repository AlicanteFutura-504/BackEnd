import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './booking.entity';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  // IMPORTANTE: declarar antes de rutas con :param
  @Get('calendar')
  findByDateRange(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
      throw new BadRequestException('Los parámetros from y to son obligatorios con formato YYYY-MM-DD');
    }
    return this.bookingsService.findByDateRange(from, to);
  }

  @Get('business/:businessId')
  findByBusiness(@Param('businessId') businessId: string) {
    return this.bookingsService.findByBusiness(+businessId);
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.bookingsService.findByCustomer(+customerId);
  }

  @Post()
  create(@Body() createBookingDto: Partial<BookingEntity>) {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBookingDto: Partial<BookingEntity>) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }
}
