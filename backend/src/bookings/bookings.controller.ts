import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, BadRequestException, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../usuarios/usuario.entity';

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
    @Query('propertyId') propertyId: string,
    @Req() req: any,
  ) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
      throw new BadRequestException('Los parámetros from y to son obligatorios con formato YYYY-MM-DD');
    }
    return this.bookingsService.findByDateRange(from, to, req.user, propertyId ? parseInt(propertyId, 10) : undefined);
  }

  @Get('property/:propertyId')
  findByBusiness(
    @Param('propertyId') propertyId: string, 
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    return this.bookingsService.findByBusiness(
      +propertyId, 
      req.user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search || ''
    );
  }

  @Get('customer/:usuarioId')
  findByCustomer(@Param('usuarioId') usuarioId: string, @Req() req: any) {
    return this.bookingsService.findByCustomer(+usuarioId, req.user);
  }

  @Post()
  @Roles(UserRole.GUEST, UserRole.HOST, UserRole.ADMIN)
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: CreateBookingDto,
    @Req() req: any,
  ) {
    return this.bookingsService.update(id, updateBookingDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.bookingsService.remove(id, req.user);
  }
}
