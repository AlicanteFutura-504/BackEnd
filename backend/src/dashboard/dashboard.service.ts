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
    let paymentQuery = this.paymentRepo.createQueryBuilder('p');

    // Apply tenancy logic if not root
    if (user.username !== 'root') {
      const bSubQuery = this.businessRepo.createQueryBuilder('bs')
        .select('bs.id')
        .where(user.role === UserRole.ADMIN ? 'bs.usuarioId = :userId' : 'bs.businessUserId = :userId');

      businessQuery.where(user.role === UserRole.ADMIN ? 'b.usuarioId = :userId' : 'b.businessUserId = :userId', { userId: user.userId });
      
      bookingQuery.where(`bk.businessId IN (${bSubQuery.getQuery()})`, { userId: user.userId });
      customerQuery.where(`c.businessId IN (${bSubQuery.getQuery()})`, { userId: user.userId });
      paymentQuery.where(`p.businessId IN (${bSubQuery.getQuery()})`, { userId: user.userId });
    }

    const totalBusinesses = await businessQuery.getCount();
    const totalBookings = await bookingQuery.getCount();
    const pendingBookings = await bookingQuery.clone().andWhere("bk.status = 'pending'").getCount();
    const totalCustomers = await customerQuery.getCount();
    
    const earningsResult = await paymentQuery.clone()
      .andWhere("p.status = 'pagado'")
      .select("SUM(p.amount)", "total")
      .getRawOne();
    const totalEarnings = earningsResult?.total || 0;

    const latestBookings = await bookingQuery.clone()
      .orderBy('bk.date', 'DESC')
      .take(5)
      .getMany();

    // Attach business names manually
    const businessIds = [...new Set(latestBookings.map(b => b.businessId))];
    let businessMap = new Map<number, string>();
    if (businessIds.length > 0) {
      const businesses = await this.businessRepo.findByIds(businessIds);
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
}
