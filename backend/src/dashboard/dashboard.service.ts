import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../business/business.entity';
import { BookingEntity } from '../bookings/booking.entity';
import { Customer } from '../customers/customer.entity';
import { Payment } from '../payments/payments.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    @InjectRepository(BookingEntity) private bookingRepo: Repository<BookingEntity>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async getSummary(user: any) {
    let businessQuery = this.businessRepo.createQueryBuilder('b');
    let bookingQuery = this.bookingRepo.createQueryBuilder('bk');
    let customerQuery = this.customerRepo.createQueryBuilder('c');
    let paymentQuery = this.paymentRepo.createQueryBuilder('p').leftJoin('p.booking', 'booking');

    // Apply tenancy logic if not root
    if (user.role !== UserRole.SUPERADMIN) {
      const bSubQuery = this.businessRepo.createQueryBuilder('bs')
        .select('bs.id')
        .where(user.role === UserRole.ADMIN ? '"bs"."usuarioId" = :userId' : '"bs"."businessUserId" = :userId');

      businessQuery.where(user.role === UserRole.ADMIN ? '"b"."usuarioId" = :userId' : '"b"."businessUserId" = :userId', { userId: user.userId });
      
      bookingQuery.where(`"bk"."businessId" IN (${bSubQuery.getQuery()})`, { userId: user.userId });
      paymentQuery.where(`"booking"."businessId" IN (${bSubQuery.getQuery()})`, { userId: user.userId });
    }

    // Run all count queries in parallel for maximum performance
    const [
      totalBusinesses,
      totalBookings,
      pendingBookings,
      totalCustomers,
      earningsResult,
      latestBookings,
    ] = await Promise.all([
      businessQuery.getCount(),
      bookingQuery.getCount(),
      bookingQuery.clone().andWhere("bk.status = 'pending'").getCount(),
      user.role === UserRole.SUPERADMIN 
        ? customerQuery.getCount() 
        : bookingQuery.clone().select('COUNT(DISTINCT bk.customerId)', 'count').getRawOne().then(res => Number(res?.count || 0)),
      paymentQuery.clone()
        .andWhere("p.status = 'pagado'")
        .select("SUM(p.amount)", "total")
        .getRawOne(),
      bookingQuery.clone()
        .orderBy('bk.date', 'DESC')
        .addOrderBy('bk.id', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const totalEarnings = earningsResult?.total || 0;

    // Attach business names
    const businessIds = [...new Set(latestBookings.map(b => b.businessId))];
    let businessMap = new Map<number, string>();
    if (businessIds.length > 0) {
      const { In } = await import('typeorm');
      const businesses = await this.businessRepo.findBy({ id: In(businessIds) });
      businessMap = new Map(businesses.map(b => [b.id, b.nombre]));
    }

    return {
      totalBusinesses,
      totalBookings,
      pendingBookings,
      totalCustomers,
      totalEarnings,
      latestBookings: latestBookings.map(b => ({
        id: b.id,
        date: b.date,
        serviceName: b.serviceName,
        status: b.status,
        businessName: businessMap.get(b.businessId) || 'Local'
      }))
    };
  }

  async getBusinessSummary(businessId: number, user: any) {
    // Verify access: superadmin sees all, admin sees their own, business sees theirs
    if (user.role !== 'superadmin') {
      const field = user.role === 'admin' ? '"usuarioId"' : '"businessUserId"';
      const business = await this.businessRepo
        .createQueryBuilder('b')
        .where(`b.id = :businessId AND b.${field} = :userId`, { businessId, userId: user.userId })
        .getOne();
      if (!business) throw new Error('Access denied');
    }

    const [totalBookings, pendingBookings, totalCustomers, earningsResult, latestBookings] = await Promise.all([
      this.bookingRepo.createQueryBuilder('bk').where('bk.businessId = :businessId', { businessId }).getCount(),
      this.bookingRepo.createQueryBuilder('bk').where('bk.businessId = :businessId AND bk.status = :s', { businessId, s: 'pending' }).getCount(),
      this.bookingRepo.createQueryBuilder('bk').where('bk.businessId = :businessId', { businessId }).select('COUNT(DISTINCT bk.customerId)', 'count').getRawOne().then(res => Number(res?.count || 0)),
      this.paymentRepo.createQueryBuilder('p')
        .leftJoin('p.booking', 'booking')
        .where('"booking"."businessId" = :businessId', { businessId })
        .select('SUM(CASE WHEN p.status = \'pagado\' THEN p.amount ELSE 0 END)', 'total')
        .addSelect('SUM(CASE WHEN p.status = \'pendiente\' THEN p.amount ELSE 0 END)', 'pending')
        .getRawOne(),
      this.bookingRepo.createQueryBuilder('bk')
        .where('bk.businessId = :businessId', { businessId })
        .orderBy('bk.date', 'DESC')
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
      latestBookings,
    };
  }
}
