import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './booking.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
  ) {}

  async findAll(user: any): Promise<BookingEntity[]> {
    const query = this.bookingsRepository.createQueryBuilder('booking')
      .innerJoin('business', 'business', 'business.id = booking.businessId');

    if (user.role === UserRole.ADMIN) {
      query.andWhere('business.usuarioId = :userId', { userId: user.userId });
    } else if (user.role === UserRole.BUSINESS) {
      query.andWhere('business.businessUserId = :userId', { userId: user.userId });
    }

    return await query.getMany();
  }

  async findByBusiness(businessId: number): Promise<BookingEntity[]> {
    return this.bookingsRepository.find({ where: { businessId } });
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
