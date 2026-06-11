import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './property.entity';
import { Review } from './review.entity';
import { BookingEntity } from '../bookings/booking.entity';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, Review, BookingEntity]),
    UsuariosModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
