import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async findAll() {
    return await this.customerRepository.find();
  }

  async findAllByBusiness(businessId: number) {
    return await this.customerRepository.find({
      where: { businessId },
    });
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return await this.customerRepository.findOne({
      where: { email },
    });
  }

  async findOne(id: number) {
    const customer = await this.customerRepository.findOneBy({ id });
    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.customerRepository.findOneBy({ email: createCustomerDto.email });
    if (existing) {
      throw new ConflictException('Ya existe un cliente con este email');
    }
    const customer = this.customerRepository.create(createCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);
    const updated = this.customerRepository.merge(customer, updateCustomerDto);
    const savedCustomer = await this.customerRepository.save(updated);

    // Si se ha actualizado el nombre o el apellido, propagamos el cambio a la tabla de pagos
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
