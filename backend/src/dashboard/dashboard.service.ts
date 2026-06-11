import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../property/property.entity';
import { BookingEntity } from '../bookings/booking.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Payment } from '../payments/payments.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(BookingEntity)
    private bookingRepo: Repository<BookingEntity>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async getSummary(user: any, range?: string) {
    const propertyQuery = this.propertyRepo.createQueryBuilder('b');
    const bookingQuery = this.bookingRepo.createQueryBuilder('bk');
    const customerQuery = this.usuarioRepo
      .createQueryBuilder('c')
      .where("c.role = 'guest'");
    const paymentQuery = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.booking', 'booking');

    if (range === 'month') {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      )
        .toISOString()
        .split('T')[0];
      bookingQuery.andWhere('bk.checkInDate >= :startDate', {
        startDate: startOfMonth,
      });
      paymentQuery.andWhere('booking.checkInDate >= :startDate', {
        startDate: startOfMonth,
      });
    } else if (range === 'week') {
      const d = new Date();
      const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay()))
        .toISOString()
        .split('T')[0];
      bookingQuery.andWhere('bk.checkInDate >= :startDate', {
        startDate: startOfWeek,
      });
      paymentQuery.andWhere('booking.checkInDate >= :startDate', {
        startDate: startOfWeek,
      });
    }

    // Apply tenancy logic if not root
    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN) {
      const properties = await this.propertyRepo.find({
        where: { usuarioId: user.userId },
        select: ['id']
      });
      const propertyIds = properties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        propertyQuery.where('1 = 0');
        bookingQuery.where('1 = 0');
        paymentQuery.where('1 = 0');
      } else {
        propertyQuery.where('b.usuarioId = :userId', { userId: user.userId });
        bookingQuery.where('bk.propertyId IN (:...propertyIds)', { propertyIds });
        paymentQuery.where('booking.propertyId IN (:...propertyIds)', { propertyIds });
      }
    }

    // Run all count queries in parallel for maximum performance
    const [
      totalProperties,
      totalBookings,
      pendingBookings,
      totalCustomers,
      earningsResult,
      latestBookings,
    ] = await Promise.all([
      propertyQuery.getCount(),
      bookingQuery.getCount(),
      bookingQuery.clone().andWhere("bk.status = 'pending'").getCount(),
      user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN
        ? customerQuery.getCount()
        : bookingQuery
            .clone()
            .select('COUNT(DISTINCT "bk"."usuarioId")', 'count')
            .getRawOne()
            .then((res) => Number(res?.count || 0)),
      paymentQuery
        .clone()
        .andWhere("p.status = 'pagado'")
        .select('SUM(p.amount)', 'total')
        .getRawOne(),
      bookingQuery
        .clone()
        .leftJoinAndSelect('bk.usuario', 'usuario')
        .leftJoinAndSelect('bk.property', 'property')
        .orderBy('bk.checkInDate', 'DESC')
        .addOrderBy('bk.id', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const totalEarnings = earningsResult?.total || 0;

    // Attach property names
    const propertyIds = [...new Set(latestBookings.map((b) => b.propertyId))];
    let propertyMap = new Map<number, string>();
    if (propertyIds.length > 0) {
      const { In } = await import('typeorm');
      const properties = await this.propertyRepo.findBy({
        id: In(propertyIds),
      });
      propertyMap = new Map(properties.map((b) => [b.id, b.nombre]));
    }

    return {
      totalProperties: totalProperties,
      totalBookings,
      pendingBookings,
      totalCustomers,
      totalEarnings,
      latestBookings: latestBookings.map((b) => ({
        id: b.id,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
        propertyName:
          b.property?.nombre || propertyMap.get(b.propertyId) || 'Propiedad',
        customerName:
          b.usuario?.nombreCompleto || b.usuario?.username || 'Huésped',
      })),
    };
  }

  async getPropertySummary(propertyId: number, user: any, range?: string) {
    // Verify access
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      const property = await this.propertyRepo.findOne({
        where: { id: propertyId, usuarioId: user.userId }
      });
      if (!property) throw new Error('Access denied');
    }

    const bQuery = this.bookingRepo
      .createQueryBuilder('bk')
      .where('bk.propertyId = :propertyId', { propertyId });
    const pQuery = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.booking', 'booking')
      .where('booking.propertyId = :propertyId', { propertyId });

    if (range === 'month') {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      )
        .toISOString()
        .split('T')[0];
      bQuery.andWhere('bk.checkInDate >= :startDate', {
        startDate: startOfMonth,
      });
      pQuery.andWhere('booking.checkInDate >= :startDate', {
        startDate: startOfMonth,
      });
    } else if (range === 'week') {
      const d = new Date();
      const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay()))
        .toISOString()
        .split('T')[0];
      bQuery.andWhere('bk.checkInDate >= :startDate', {
        startDate: startOfWeek,
      });
      pQuery.andWhere('booking.checkInDate >= :startDate', {
        startDate: startOfWeek,
      });
    }

    const [
      totalBookings,
      pendingBookings,
      totalCustomers,
      earningsResult,
      latestBookings,
    ] = await Promise.all([
      bQuery.clone().getCount(),
      bQuery.clone().andWhere("bk.status = 'pending'").getCount(),
      bQuery
        .clone()
        .select('COUNT(DISTINCT "bk"."usuarioId")', 'count')
        .getRawOne()
        .then((res) => Number(res?.count || 0)),
      pQuery
        .clone()
        .select(
          "SUM(CASE WHEN p.status = 'pagado' THEN p.amount ELSE 0 END)",
          'total',
        )
        .addSelect(
          "SUM(CASE WHEN p.status = 'pendiente' THEN p.amount ELSE 0 END)",
          'pending',
        )
        .getRawOne(),
      bQuery
        .clone()
        .leftJoinAndSelect('bk.usuario', 'usuario')
        .leftJoinAndSelect('bk.property', 'property')
        .orderBy('bk.checkInDate', 'DESC')
        .addOrderBy('bk.id', 'DESC')
        .take(5)
        .getMany(),
    ]);

    return {
      totalBookings,
      pendingBookings,
      totalCustomers,
      totalRevenue: Number(earningsResult?.total || 0),
      pendingRevenue: Number(earningsResult?.pending || 0),
      latestBookings: latestBookings.map((b) => ({
        id: b.id,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
        propertyName: b.property?.nombre || 'Propiedad',
        customerName:
          b.usuario?.nombreCompleto || b.usuario?.username || 'Huésped',
      })),
    };
  }
}
