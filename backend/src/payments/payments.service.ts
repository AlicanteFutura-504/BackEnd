import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payment } from './payments.entity';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';
import { Property } from '../property/property.entity';
import { Usuario } from '../usuarios/usuario.entity';

interface ReqUser {
  userId: number;
  username: string;
  role: string;
  propertyId?: number | null;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  private async getAccessibleIds(user: any): Promise<number[] | null> {
    if (user.role === 'superadmin' || user.role === 'admin') return null;

    if (user.role === 'host') {
      const properties = await this.propertyRepository.find({
        where: { usuarioId: user.userId },
        select: ['id'],
      });
      return properties.map((b) => b.id);
    }
    return [];
  }

  async findAll(
    user: ReqUser,
    page: number = 1,
    limit: number = 20,
    search: string = '',
    propertyId?: string
  ): Promise<{ data: Payment[], total: number }> {
    const ids = await this.getAccessibleIds(user);
    if (ids !== null && ids.length === 0) return { data: [], total: 0 };

    const query = this.paymentsRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndMapOne('payment.customer', Usuario, 'customer', '"customer"."id" = "booking"."usuarioId"');

    if (ids !== null) {
      query.where('"booking"."propertyId" IN (:...ids)', { ids });
    }

    if (propertyId) {
      if (ids !== null) {
        query.andWhere('"booking"."propertyId" = :bId', { bId: parseInt(propertyId, 10) });
      } else {
        query.where('"booking"."propertyId" = :bId', { bId: parseInt(propertyId, 10) });
      }
    }

    const [data, total] = await query
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number) {
    const payment = await this.paymentsRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndMapOne('payment.customer', Usuario, 'customer', '"customer"."id" = "booking"."usuarioId"')
      .where('payment.id = :id', { id })
      .getOne();
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
    if (ids !== null && payment.booking?.propertyId && !ids.includes(payment.booking.propertyId)) {
      throw new ForbiddenException('No tienes permiso para modificar este pago');
    }

    const updatedPayment = this.paymentsRepository.merge(payment, updatePaymentDto);
    return this.paymentsRepository.save(updatedPayment);
  }

  async remove(id: number, user: ReqUser) {
    const payment = await this.findOne(id);

    const ids = await this.getAccessibleIds(user);
    if (ids !== null && payment.booking?.propertyId && !ids.includes(payment.booking.propertyId)) {
      throw new ForbiddenException('No tienes permiso para eliminar este pago');
    }

    await this.paymentsRepository.remove(payment);
    return { message: `Pago ${id} eliminado correctamente` };
  }


}
