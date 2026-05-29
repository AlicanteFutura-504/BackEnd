import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, BadRequestException, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './booking.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    return this.bookingsService.findAll(
      req.user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || ''
    );
  }

  // IMPORTANTE: declarar antes de rutas con :param
  @Get('calendar')
  findByDateRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
      throw new BadRequestException('Los parámetros from y to son obligatorios con formato YYYY-MM-DD');
    }
    return this.bookingsService.findByDateRange(from, to, req.user);
  }

  @Get('business/:businessId')
  findByBusiness(
    @Param('businessId') businessId: string, 
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    return this.bookingsService.findByBusiness(
      +businessId, 
      req.user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search || ''
    );
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId') customerId: string, @Req() req: any) {
    return this.bookingsService.findByCustomer(+customerId, req.user);
  }

  @Post()
  create(@Body() createBookingDto: Partial<BookingEntity>) {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: Partial<BookingEntity>,
    @Req() req: any,
  ) {
    return this.bookingsService.update(id, updateBookingDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.bookingsService.remove(id, req.user);
  }
}
