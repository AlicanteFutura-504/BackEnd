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

  async findByCustomer(customerId: number): Promise<BookingEntity[]> {
    return this.bookingsRepository.find({ where: { customerId } });
  }

  async findByDateRange(from: string, to: string): Promise<BookingEntity[]> {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.date >= :from', { from })
      .andWhere('booking.date <= :to', { to })
      .orderBy('booking.date', 'ASC')
      .addOrderBy('booking.time', 'ASC')
      .getMany();
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    const booking = this.bookingsRepository.create(data);
    return this.bookingsRepository.save(booking);
  }

  async update(id: number, data: Partial<BookingEntity>): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking con ID ${id} no encontrada`);
    }
    Object.assign(booking, data);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: number): Promise<void> {
    const result = await this.bookingsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Booking con ID ${id} no encontrada`);
    }
  }
}
