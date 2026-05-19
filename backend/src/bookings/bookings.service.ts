import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
  ) {}

  async findAll(): Promise<BookingEntity[]> {
    return this.bookingsRepository.find();
  }

  async findByBusiness(businessId: number): Promise<BookingEntity[]> {
    return this.bookingsRepository.find({ where: { businessId } });
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    const booking = this.bookingsRepository.create(data);
    return this.bookingsRepository.save(booking);
  }
}
