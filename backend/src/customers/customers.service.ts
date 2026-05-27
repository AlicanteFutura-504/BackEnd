import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaymentsService } from '../payments/payments.service';
import { Business } from '../business/business.entity';

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
  ) {}

  private async getAccessibleIds(user: ReqUser): Promise<number[] | null> {
    if (user.username === 'root') return null;
    if (user.role === 'business') {
      return user.businessId ? [user.businessId] : [];
    }
    const businesses = await this.businessRepository.find({
      where: { usuarioId: user.userId },
      select: ['id'],
    });
    return businesses.map((b) => b.id);
  }

  async findAll(user: ReqUser) {
    const ids = await this.getAccessibleIds(user);
    if (ids === null) return this.customerRepository.find();
    if (ids.length === 0) return [];
    return this.customerRepository.find({ where: { businessId: In(ids) } });
  }

  async findAllByBusiness(businessId: number, user: ReqUser) {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && !ids.includes(businessId)) {
      throw new ForbiddenException('No tienes acceso a este negocio');
    }
    return this.customerRepository.find({ where: { businessId } });
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

    if (updateCustomerDto.name !== undefined || updateCustomerDto.surname !== undefined) {
      const fullName = `${savedCustomer.name} ${savedCustomer.surname || ''}`.trim();
      await this.paymentsService.updateClientNameForCustomer(savedCustomer.id, fullName);
    }
    return savedCustomer;
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
    return { message: `Cliente ${id} eliminado correctamente` };
  }
}
