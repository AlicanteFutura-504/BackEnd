import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingEntity } from './booking.entity';
import { Business } from '../business/business.entity';

/** Datos del usuario autenticado extraídos del JWT */
interface ReqUser {
  userId: number;
  username: string;
  role: string;
  businessId?: number | null;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  /**
   * Devuelve los IDs de negocio a los que el usuario tiene acceso.
   * - root        → null  (sin filtro, ve todo)
   * - ADMIN       → IDs de sus propios negocios
   * - BUSINESS    → [businessId] del token
   */
  private async getAccessibleIds(user: ReqUser): Promise<number[] | null> {
    if (user.username === 'root') return null;

    if (user.role === 'business') {
      return user.businessId ? [user.businessId] : [];
    }

    // ADMIN: obtener todos sus negocios
    const businesses = await this.businessRepository.find({
      where: { usuarioId: user.userId },
      select: ['id'],
    });
    return businesses.map((b) => b.id);
  }

  async findAll(user: ReqUser): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    if (ids === null) return this.bookingsRepository.find();
    if (ids.length === 0) return [];
    return this.bookingsRepository.find({ where: { businessId: In(ids) } });
  }

  async findByBusiness(businessId: number, user: ReqUser): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(businessId)) {
      throw new ForbiddenException('No tienes acceso a este negocio');
    }
    return this.bookingsRepository.find({ where: { businessId } });
  }

  async findByCustomer(customerId: number, user: ReqUser): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    if (ids === null) {
      return this.bookingsRepository.find({ where: { customerId } });
    }
    if (ids.length === 0) return [];
    return this.bookingsRepository.find({
      where: { customerId, businessId: In(ids) },
    });
  }

  async findByDateRange(from: string, to: string, user: ReqUser): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.date >= :from', { from })
      .andWhere('booking.date <= :to', { to });

    if (ids !== null) {
      if (ids.length === 0) return [];
      qb.andWhere('booking.businessId IN (:...ids)', { ids });
    }

    return qb.orderBy('booking.date', 'ASC').addOrderBy('booking.time', 'ASC').getMany();
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    const booking = this.bookingsRepository.create(data);
    return this.bookingsRepository.save(booking);
  }

  async update(id: number, data: Partial<BookingEntity>, user: ReqUser): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(booking.businessId)) {
      throw new ForbiddenException('No tienes permiso para modificar esta reserva');
    }

    Object.assign(booking, data);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: number, user: ReqUser): Promise<void> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(booking.businessId)) {
      throw new ForbiddenException('No tienes permiso para eliminar esta reserva');
    }

    await this.bookingsRepository.delete(id);
  }
}
