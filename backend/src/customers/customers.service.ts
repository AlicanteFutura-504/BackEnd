import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll() {
    return await this.customerRepository.find();
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
    return await this.customerRepository.save(updated);
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
    return { message: `Cliente ${id} eliminado correctamente` };
  }
}
