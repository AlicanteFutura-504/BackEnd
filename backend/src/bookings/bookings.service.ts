import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus } from './booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingEntity } from './booking.entity';
import { Property } from '../property/property.entity';
import { Payment, PaymentStatus, PaymentType } from '../payments/payments.entity';
import { MailerService, BookingMailData } from '../mailer/mailer.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
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

  private async autoCancelExpiredBookings(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      await this.bookingsRepository
        .createQueryBuilder()
        .update(BookingEntity)
        .set({ status: BookingStatus.CANCELLED, cancelReason: 'Expirada por falta de pago' })
        .where('status IN (:...statuses)', { statuses: [BookingStatus.PENDING, BookingStatus.PENDING_HOST_APPROVAL] })
        .andWhere('checkInDate < :today', { today })
        .execute();
    } catch (e) {
      console.error('Error during autoCancelExpiredBookings:', e);
    }
  }

  async findAll(
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = '',
  ): Promise<{ data: BookingEntity[]; total: number }> {
    await this.autoCancelExpiredBookings();

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && ids.length === 0) return { data: [], total: 0 };

    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.usuario', 'usuario')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.payment', 'payment');

    if (ids !== null) {
      query.where('booking.propertyId IN (:...ids)', { ids });
    }

    if (search) {
      query.andWhere('(LOWER(booking.status) LIKE LOWER(:search))', {
        search: `%${search}%`,
      });
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
    search: string = '',
  ): Promise<{ data: BookingEntity[]; total: number }> {
    await this.autoCancelExpiredBookings();

    const ids = await this.getAccessibleIds(user);
    console.log('DEBUG findByProperty:', { propertyId, user, ids });
    if (ids !== null && !ids.includes(propertyId)) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }

    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.usuario', 'usuario')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.payment', 'payment')
      .where('booking.propertyId = :propertyId', { propertyId });

    if (search) {
      query.andWhere('LOWER(booking.status) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query
      .orderBy('booking.checkInDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findByCustomer(
    usuarioId: number,
    user: ReqUser,
  ): Promise<BookingEntity[]> {
    await this.autoCancelExpiredBookings();

    const ids = await this.getAccessibleIds(user);
    if (ids === null || user.userId === usuarioId) {
      return this.bookingsRepository.find({
        where: { usuarioId },
        relations: ['payment', 'usuario', 'property'],
      });
    }
    if (ids.length === 0) return [];
    return this.bookingsRepository.find({
      where: { usuarioId, propertyId: In(ids) },
      relations: ['payment', 'usuario', 'property'],
    });
  }

  async findByDateRange(
    from: string,
    to: string,
    user: ReqUser,
    propertyId?: number,
  ): Promise<BookingEntity[]> {
    await this.autoCancelExpiredBookings();

    const ids = await this.getAccessibleIds(user);
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.checkInDate >= :from', { from })
      .andWhere('booking.checkInDate <= :to', { to });

    if (propertyId) {
      if (ids !== null && !ids.includes(propertyId))
        throw new ForbiddenException('No tienes acceso a esta propiedad');
      qb.andWhere('booking.propertyId = :propertyId', { propertyId });
    } else if (ids !== null) {
      if (ids.length === 0) return [];
      qb.andWhere('booking.propertyId IN (:...ids)', { ids });
    }

    return qb.orderBy('booking.checkInDate', 'ASC').getMany();
  }

  async create(data: Partial<BookingEntity>): Promise<BookingEntity> {
    await this.autoCancelExpiredBookings();

    if (!data.propertyId || !data.checkInDate || !data.checkOutDate) {
      throw new BadRequestException('Faltan datos de reserva');
    }
    const overlap = await this.hasOverlappingBooking(
      data.propertyId,
      data.checkInDate,
      data.checkOutDate,
    );
    if (overlap) {
      throw new ConflictException(
        'La propiedad ya está reservada en esas fechas',
      );
    }

    // Buscar la propiedad para calcular precio e info si no viene pago
    const propertyObj = await this.propertyRepository.findOne({
      where: { id: data.propertyId },
    });
    if (!propertyObj) {
      throw new NotFoundException(`La propiedad con ID ${data.propertyId} no existe`);
    }

    if (!data.payment) {
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const totalPrice = diffDays * Number(propertyObj.pricePerNight || 0);

      let finalPrice = totalPrice;
      if (data.usuarioId) {
        const { status } = await this.usuariosService.getGuestTrustScore(
          data.usuarioId,
        );
        if (status === 'Promoter') {
          finalPrice = totalPrice * 0.9; // 10% de descuento
        }
      }

      const newPayment = new Payment();
      newPayment.amount = Number(finalPrice.toFixed(2));
      newPayment.status = PaymentStatus.PENDING;
      newPayment.type = PaymentType.PENDING;
      newPayment.date = new Date().toISOString().split('T')[0];

      data.payment = newPayment;
    } else if (data.usuarioId) {
      const { status } = await this.usuariosService.getGuestTrustScore(
        data.usuarioId,
      );
      if (status === 'Promoter') {
        data.payment.amount = data.payment.amount * 0.9; // 10% de descuento
      }
    }

    const booking = this.bookingsRepository.create(data);
    
    // Explicitly set the back-reference so the cascade save assigns the correct bookingId
    if (booking.payment) {
      booking.payment.booking = booking;
    }

    const savedBooking = await this.bookingsRepository.save(booking);

    // Enviar notificación
    try {
      const guest = await this.usuariosService.findOneById(
        savedBooking.usuarioId,
      );
      const property = await this.propertyRepository.findOne({
        where: { id: savedBooking.propertyId },
      });
      if (guest && property) {
        const mailData: BookingMailData = {
          guestEmail: guest.email,
          guestName: guest.nombreCompleto || guest.username,
          propertyName: property.nombre,
          checkInDate: savedBooking.checkInDate,
          checkOutDate: savedBooking.checkOutDate,
          status: savedBooking.status as any,
        };

        // Notify Guest
        await this.notificationsService.sendDualNotification(
          savedBooking.usuarioId,
          mailData,
          'booking_created_guest',
          { bookingId: savedBooking.id }
        );

        // Notify Host
        const host = await this.usuariosService.findOneById(property.usuarioId);
        if (host) {
          const hostMailData: BookingMailData = {
            ...mailData,
            guestEmail: host.email,
            guestName: host.nombreCompleto || host.username,
          };
          await this.notificationsService.sendDualNotification(
            property.usuarioId,
            hostMailData,
            'booking_created_host',
            { bookingId: savedBooking.id }
          );
        }
      }
    } catch (e) {
      console.error('Error sending notification on create:', e);
    }

    if (savedBooking.payment && savedBooking.payment.booking) {
      delete (savedBooking.payment as any).booking;
    }
    
    return savedBooking;
  }

  async update(
    id: number,
    data: Partial<BookingEntity>,
    user: ReqUser,
  ): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking)
      throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (
      ids !== null &&
      !ids.includes(booking.propertyId) &&
      user.userId !== booking.usuarioId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta reserva',
      );
    }

    // Verificar solapamiento de fechas si se proporcionan nuevas fechas
    if (data.checkInDate && data.checkOutDate) {
      const propertyId = data.propertyId ?? booking.propertyId;
      const overlap = await this.hasOverlappingBooking(
        propertyId,
        data.checkInDate,
        data.checkOutDate,
        id,
      );
      if (overlap) {
        throw new ConflictException(
          'La propiedad ya está reservada en esas fechas',
        );
      }
    }

    Object.assign(booking, data);
    let updatedBooking;
    try {
      updatedBooking = await this.bookingsRepository.save(booking);
    } catch (error: any) {
      console.error("Error saving updated booking:", error);
      throw new BadRequestException("Error saving booking: " + error.message);
    }

    // Enviar notificación
    try {
      const guest = await this.usuariosService.findOneById(
        updatedBooking.usuarioId,
      );
      const property = await this.propertyRepository.findOne({
        where: { id: updatedBooking.propertyId },
      });
      if (guest && property) {
        const mailData: BookingMailData = {
          guestEmail: guest.email,
          guestName: guest.nombreCompleto || guest.username,
          propertyName: property.nombre,
          checkInDate: updatedBooking.checkInDate,
          checkOutDate: updatedBooking.checkOutDate,
          status: updatedBooking.status as any,
        };

        // Notify Guest
        await this.notificationsService.sendDualNotification(
          updatedBooking.usuarioId,
          mailData,
          `booking_${updatedBooking.status}_guest`,
          { bookingId: updatedBooking.id }
        );

        // Notify Host if status changed
        if (data.status) {
          const host = await this.usuariosService.findOneById(property.usuarioId);
          if (host) {
            const hostMailData: BookingMailData = {
              ...mailData,
              guestEmail: host.email,
              guestName: host.nombreCompleto || host.username,
            };
            await this.notificationsService.sendDualNotification(
              property.usuarioId,
              hostMailData,
              `booking_${updatedBooking.status}_host`,
              { bookingId: updatedBooking.id }
            );
          }
        }
      }
    } catch (e) {
      console.error('Error sending notification on update:', e);
    }

    return updatedBooking;
  }

  async remove(id: number, user: ReqUser): Promise<void> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking)
      throw new NotFoundException(`Booking con ID ${id} no encontrada`);

    const ids = await this.getAccessibleIds(user);
    if (
      ids !== null &&
      !ids.includes(booking.propertyId) &&
      user.userId !== booking.usuarioId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta reserva',
      );
    }

    await this.bookingsRepository.delete(id);
  }

  async hostDecision(
    id: number,
    decision: 'confirmed' | 'cancelled',
    cancelReason: string,
    user: ReqUser
  ): Promise<BookingEntity> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(booking.propertyId)) {
      throw new ForbiddenException('No tienes permiso para decidir sobre esta reserva');
    }

    if (decision === 'cancelled' && !cancelReason) {
      throw new BadRequestException('El motivo de cancelación es obligatorio');
    }

    booking.status = decision === 'confirmed' ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED;
    if (decision === 'cancelled') {
      (booking as any).cancelReason = cancelReason;
    }

    const updatedBooking = await this.bookingsRepository.save(booking);

    // Notificar al huésped
    try {
      const guest = await this.usuariosService.findOneById(updatedBooking.usuarioId);
      const property = await this.propertyRepository.findOne({ where: { id: updatedBooking.propertyId } });
      if (guest && property) {
        const mailData: BookingMailData = {
          guestEmail: guest.email,
          guestName: guest.nombreCompleto || guest.username,
          propertyName: property.nombre,
          checkInDate: updatedBooking.checkInDate,
          checkOutDate: updatedBooking.checkOutDate,
          status: updatedBooking.status as any,
        };
        await this.notificationsService.sendDualNotification(
          updatedBooking.usuarioId,
          mailData,
          `booking_${updatedBooking.status}_guest`,
          { bookingId: updatedBooking.id }
        );
      }
    } catch (e) {
      console.error('Error enviando notificación en hostDecision', e);
    }

    return updatedBooking;
  }

  private async hasOverlappingBooking(
    propertyId: number,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: number,
  ): Promise<boolean> {
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
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

  async getOccupiedDates(propertyId: number): Promise<string[]> {
    await this.autoCancelExpiredBookings();

    const bookings = await this.bookingsRepository.find({
      where: {
        propertyId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.MODIFIED, BookingStatus.TERMINADA] as any[]),
      },
      select: ['checkInDate', 'checkOutDate'],
    });

    const occupiedDates = new Set<string>();
    for (const b of bookings) {
      let current = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      while (current < end) {
        occupiedDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
    return Array.from(occupiedDates);
  }
}
