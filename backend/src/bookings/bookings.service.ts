import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { BookingStatus } from './booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingEntity } from './booking.entity';
import { Property } from '../property/property.entity';
import { Payment } from '../payments/payments.entity';
import { MailerService, BookingMailData } from '../mailer/mailer.service';
import { UsuariosService } from '../usuarios/usuarios.service';

/** Datos del usuario autenticado extraídos del JWT */
interface ReqUser {
  userId: number;
  username: string;
  role: string;
  propertyId?: number | null;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly mailerService: MailerService,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Devuelve los IDs de propiedades a las que el usuario tiene acceso.
   * - SUPERADMIN  → null  (sin filtro, ve todo)
   * - HOST        → IDs de sus propias propiedades
   */
  private async getAccessibleIds(user: ReqUser): Promise<number[] | null> {
    if (user.role === 'superadmin' || user.role === 'admin') return null;

    if (user.role === 'host') {
      const properties = await this.propertyRepository.find({
        where: { usuarioId: user.userId },
        select: ['id'],
      });
      return properties.map((p) => p.id);
    }
    
    return []; // guest o desconocido no tiene acceso por esta vía a consultar IDs ajenos
  }

  async findAll(
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = ''
  ): Promise<{ data: BookingEntity[], total: number }> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && ids.length === 0) return { data: [], total: 0 };

    const query = this.bookingsRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.usuario', 'usuario')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.payment', 'payment');
      
    if (ids !== null) {
      query.where('booking.propertyId IN (:...ids)', { ids });
    }

    if (search) {
      query.andWhere(
        '(LOWER(booking.status) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .orderBy('booking.checkInDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findByProperty(
    propertyId: number, 
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = ''
  ): Promise<{ data: BookingEntity[], total: number }> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(propertyId)) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
    
    const query = this.bookingsRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.usuario', 'usuario')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.payment', 'payment')
      .where('booking.propertyId = :propertyId', { propertyId });
      
    if (search) {
      query.andWhere('LOWER(booking.status) LIKE LOWER(:search)', { search: `%${search}%` });
    }
    
    const [data, total] = await query
      .orderBy('booking.checkInDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
      
    return { data, total };
  }

  async findByCustomer(usuarioId: number, user: ReqUser): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    if (ids === null || user.userId === usuarioId) {
      return this.bookingsRepository.find({ 
        where: { usuarioId },
        relations: ['payment', 'usuario', 'property']
      });
    }
    if (ids.length === 0) return [];
    return this.bookingsRepository.find({
      where: { usuarioId, propertyId: In(ids) },
      relations: ['payment', 'usuario', 'property']
    });
  }

  async findByDateRange(from: string, to: string, user: ReqUser, propertyId?: number): Promise<BookingEntity[]> {
    const ids = await this.getAccessibleIds(user);
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.checkInDate >= :from', { from })
      .andWhere('booking.checkInDate <= :to', { to });

    if (propertyId) {
      if (ids !== null && !ids.includes(propertyId)) throw new ForbiddenException('No tienes acceso a esta propiedad');
      qb.andWhere('booking.propertyId = :propertyId', { propertyId });
    } else if (ids !== null) {
      if (ids.length === 0) return [];
      qb.andWhere('booking.propertyId IN (:...ids)', { ids });
    }

    return qb.orderBy('booking.checkInDate', 'ASC').getMany();
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    if (!data.propertyId || !data.checkInDate || !data.checkOutDate) {
      throw new BadRequestException('Faltan datos de reserva');
    }
    const overlap = await this.hasOverlappingBooking(data.propertyId, data.checkInDate, data.checkOutDate);
    if (overlap) {
      throw new ConflictException('La propiedad ya está reservada en esas fechas');
    }

    if (data.payment && data.usuarioId) {
      const { status } = await this.usuariosService.getGuestTrustScore(data.usuarioId);
      if (status === 'Promoter') {
        data.payment.amount = data.payment.amount * 0.90; // 10% de descuento
      }
    }

    const booking = this.bookingsRepository.create(data);
    const savedBooking = await this.bookingsRepository.save(booking);

    // Enviar notificación
    try {
      const guest = await this.usuariosService.findOneById(savedBooking.usuarioId);
      const property = await this.propertyRepository.findOne({ where: { id: savedBooking.propertyId }});
      if (guest && property) {
        await this.mailerService.sendBookingNotification({
          guestEmail: guest.email,
          guestName: guest.nombreCompleto || guest.username,
          propertyName: property.nombre,
          checkInDate: savedBooking.checkInDate,
          checkOutDate: savedBooking.checkOutDate,
          status: savedBooking.status as any,
        });
      }
    } catch (e) {
      // Ignorar errores de correo
    }

    return savedBooking;
  }

  async update(id: number, data: Partial<BookingEntity>, user: ReqUser): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(booking.propertyId) && user.userId !== booking.usuarioId) {
      throw new ForbiddenException('No tienes permiso para modificar esta reserva');
    }

    // Verificar solapamiento de fechas si se proporcionan nuevas fechas
    if (data.checkInDate && data.checkOutDate) {
      const propertyId = data.propertyId ?? booking.propertyId;
      const overlap = await this.hasOverlappingBooking(propertyId, data.checkInDate, data.checkOutDate, id);
      if (overlap) {
        throw new ConflictException('La propiedad ya está reservada en esas fechas');
      }
    }

    Object.assign(booking, data);
    const updatedBooking = await this.bookingsRepository.save(booking);

    // Enviar notificación
    try {
      const guest = await this.usuariosService.findOneById(updatedBooking.usuarioId);
      const property = await this.propertyRepository.findOne({ where: { id: updatedBooking.propertyId }});
      if (guest && property) {
        await this.mailerService.sendBookingNotification({
          guestEmail: guest.email,
          guestName: guest.nombreCompleto || guest.username,
          propertyName: property.nombre,
          checkInDate: updatedBooking.checkInDate,
          checkOutDate: updatedBooking.checkOutDate,
          status: updatedBooking.status as any, // 'modified', 'cancelled', 'confirmed'
        });
      }
    } catch (e) {}

    return updatedBooking;
  }

  async remove(id: number, user: ReqUser): Promise<void> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(booking.propertyId) && user.userId !== booking.usuarioId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta reserva');
    }

    await this.bookingsRepository.delete(id);
  }

  private async hasOverlappingBooking(
    propertyId: number,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: number,
  ): Promise<boolean> {
    const qb = this.bookingsRepository.createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.checkInDate < :checkOutDate', { checkOutDate })
      .andWhere('booking.checkOutDate > :checkInDate', { checkInDate })
      .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' });

    if (excludeBookingId) {
      qb.andWhere('booking.id != :excludeId', { excludeId: excludeBookingId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
