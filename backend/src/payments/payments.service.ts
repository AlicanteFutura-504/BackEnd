import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payment } from './payments.entity';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';
import { Business } from '../business/business.entity';

interface ReqUser {
  userId: number;
  username: string;
  role: string;
  businessId?: number | null;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
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
    if (ids === null) return this.paymentsRepository.find();
    if (ids.length === 0) return [];
    return this.paymentsRepository.find({ where: { businessId: In(ids) } });
  }

  async findOne(id: number) {
    const payment = await this.paymentsRepository.findOneBy({ id });
    if (!payment) throw new NotFoundException(`No existe el pago con id ${id}`);
    return payment;
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const payment = this.paymentsRepository.create(createPaymentDto);
    return this.paymentsRepository.save(payment);
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto, user: ReqUser) {
    const payment = await this.findOne(id);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && payment.businessId && !ids.includes(payment.businessId)) {
      throw new ForbiddenException('No tienes permiso para modificar este pago');
    }

    const updatedPayment = this.paymentsRepository.merge(payment, updatePaymentDto);
    return this.paymentsRepository.save(updatedPayment);
  }

  async remove(id: number, user: ReqUser) {
    const payment = await this.findOne(id);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && payment.businessId && !ids.includes(payment.businessId)) {
      throw new ForbiddenException('No tienes permiso para eliminar este pago');
    }

    await this.paymentsRepository.remove(payment);
    return { message: `Pago ${id} eliminado correctamente` };
  }

  async updateClientNameForCustomer(customerId: number, clientName: string) {
    await this.paymentsRepository.update({ customerId }, { clientName });
  }
}
