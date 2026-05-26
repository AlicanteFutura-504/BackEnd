import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payments.entity';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';

/**
 * Servicio encargado de gestionar la lógica de negocio de los pagos.
 * Actúa como intermediario entre el controlador y la base de datos (TypeORM).
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) { }

  /**
   * Obtiene todos los pagos de la base de datos.
   * @returns Lista completa de pagos (Payment[])
   */
  async findAll() {
    return await this.paymentsRepository.find();
  }

  /**
   * Busca un pago específico utilizando su ID.
   * Lanzará una excepción si el pago no existe.
   * @param id El identificador único del pago.
   * @throws NotFoundException si no se encuentra el pago.
   * @returns El pago encontrado.
   */
  async findOne(id: number) {
    const payment = await this.paymentsRepository.findOneBy({ id });

    if (!payment) {
      throw new NotFoundException(`No existe el pago con id ${id}`);
    }

    return payment;
  }

  /**
   * Crea un nuevo pago en el sistema y lo guarda en la base de datos.
   * @param createPaymentDto Los datos validados provenientes de la petición.
   * @returns El nuevo pago creado con su ID asignado.
   */
  async create(createPaymentDto: CreatePaymentDto) {
    const payment = this.paymentsRepository.create(createPaymentDto);
    return await this.paymentsRepository.save(payment);
  }

  /**
   * Actualiza parcialmente un pago existente.
   * @param id Identificador del pago a modificar.
   * @param updatePaymentDto Campos a actualizar.
   * @throws NotFoundException Si el pago no existe.
   * @returns El pago con los datos actualizados.
   */
  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    // Verificamos existencia usando el método findOne ya definido
    const payment = await this.findOne(id);

    const updatedPayment = this.paymentsRepository.merge(
      payment,
      updatePaymentDto,
    );

    return await this.paymentsRepository.save(updatedPayment);
  }

  /**
   * Elimina un pago de la base de datos de manera permanente.
   * @param id Identificador del pago a eliminar.
   * @throws NotFoundException Si el pago no existe.
   * @returns Un objeto con un mensaje de éxito.
   */
  async remove(id: number) {
    // Verificamos existencia antes de intentar borrar
    const payment = await this.findOne(id);

    await this.paymentsRepository.remove(payment);

    return { message: `Pago ${id} eliminado correctamente` };
  }

  /**
   * Actualiza el nombre del cliente en todos sus pagos.
   * Útil para cuando se modifica el perfil global del cliente.
   * @param customerId ID del cliente
   * @param clientName Nuevo nombre completo a asignar
   */
  async updateClientNameForCustomer(customerId: number, clientName: string) {
    await this.paymentsRepository.update(
      { customerId },
      { clientName }
    );
  }
}