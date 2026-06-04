import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, Brackets } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaymentsService } from '../payments/payments.service';
import { Business } from '../business/business.entity';
import { BookingEntity } from '../bookings/booking.entity';
import { Payment } from '../payments/payments.entity';

interface ReqUser {
  userId: number;
  username: string;
  role: string;
  businessId?: number | null;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
  ) {}

  private async getAccessibleIds(user: ReqUser): Promise<number[] | null> {
    if (user.role === 'superadmin') return null;

    const whereCondition = user.role === 'admin' 
      ? { usuarioId: user.userId } 
      : { businessUserId: user.userId };

    const businesses = await this.businessRepository.find({
      where: whereCondition,
      select: ['id'],
    });
    return businesses.map((b) => b.id);
  }

  async findAll(
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = ''
  ): Promise<{ data: Customer[], total: number }> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && ids.length === 0) return { data: [], total: 0 };

    const query = this.customerRepository.createQueryBuilder('customer');
    if (ids !== null) {
      const bookingRepo = this.dataSource.getRepository(BookingEntity);
      const bookings = await bookingRepo.find({ where: { businessId: In(ids) }, select: ['usuarioId'] });
      
      const relatedCustomerIds = new Set<number>();
      bookings.forEach(b => { if (b.usuarioId) relatedCustomerIds.add(b.usuarioId); });

      if (relatedCustomerIds.size === 0) {
        return { data: [], total: 0 };
      }
      
      query.where('customer.id IN (:...relatedCustomerIds)', { relatedCustomerIds: Array.from(relatedCustomerIds) });
    }

    if (search) {
      query.andWhere(
        '(LOWER(customer.name) LIKE LOWER(:search) OR LOWER(customer.surname) LIKE LOWER(:search) OR LOWER(customer.email) LIKE LOWER(:search) OR LOWER(customer.phone) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .orderBy('customer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findAllByBusiness(
    businessId: number, 
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = ''
  ): Promise<{ data: Customer[], total: number }> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(businessId)) {
      throw new ForbiddenException('No tienes acceso a este negocio');
    }

    // Obtener clientes asociados a través de reservas
    const bookingRepo = this.dataSource.getRepository(BookingEntity);
    const bookings = await bookingRepo.find({ where: { businessId }, select: ['usuarioId'] });

    const relatedCustomerIds = new Set<number>();
    bookings.forEach(b => { if (b.usuarioId) relatedCustomerIds.add(b.usuarioId); });

    if (relatedCustomerIds.size === 0) {
      return { data: [], total: 0 };
    }

    const query = this.customerRepository.createQueryBuilder('customer');
    query.where('customer.id IN (:...relatedCustomerIds)', { relatedCustomerIds: Array.from(relatedCustomerIds) });

    if (search) {
      query.andWhere(
        '(LOWER(customer.name) LIKE LOWER(:search) OR LOWER(customer.surname) LIKE LOWER(:search) OR LOWER(customer.email) LIKE LOWER(:search) OR LOWER(customer.phone) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .orderBy('customer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { email } });
  }

  async findOne(id: number) {
    const customer = await this.customerRepository.findOneBy({ id });
    if (!customer) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.customerRepository.findOneBy({ email: createCustomerDto.email });
    if (existing) throw new ConflictException('Ya existe un cliente con este email');
    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);
    const updated = this.customerRepository.merge(customer, updateCustomerDto);
    const savedCustomer = await this.customerRepository.save(updated);


    return savedCustomer;
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
    return { message: `Cliente ${id} eliminado correctamente` };
  }
}
