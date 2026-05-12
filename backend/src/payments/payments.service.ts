import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './Payments.entity';
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
   * Las devuelve ordenadas por fecha y hora de forma ascendente.
   * @returns Lista completa de pagos (Payment[])
   */
  async findAll() {
    return await this.paymentsRepository.find({
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  /**
   * Busca un pago específico utilizando su ID.
   * Lanzará una excepción si el pago no existe.
   * @param id El identificador único del pago.
   * @throws NotFoundException si no se encuentra el pago.
   * @returns El pago encontrado.
   */
  async findOne(id: number) {
    const appointment = await this.paymentsRepository.findOneBy({ id });

    if (!appointment) {
      throw new NotFoundException(`No existe el pago con id ${id}`);
    }

    return appointment;
  }

  /**
   * Crea una nueva reserva en el sistema y la guarda en la base de datos.
   * Incluye validaciones para evitar fechas pasadas y citas duplicadas en el mismo horario.
   * @param createPaymentDto Los datos validados provenientes de la petición.
   * @throws BadRequestException si la fecha es pasada o el horario ya está ocupado.
   * @returns El nuevo pago creado con su ID asignado.
   */
  async create(createPaymentDto: CreatePaymentDto) {
    const { date, time, businessId } = createPaymentDto;

    // 1. Validación: Evitar reservas en fechas pasadas
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException('No se pueden realizar reservas en fechas pasadas.');
    }

    // 2. Validación: Evitar duplicados (mismo negocio, mismo día, misma hora)
    const isSlotBusy = await this.paymentsRepository.findOne({
      where: { date, time, businessId },
    });

    if (isSlotBusy) {
      throw new BadRequestException('Este horario ya se encuentra reservado para este establecimiento.');
    }

    const appointment = this.paymentsRepository.create(createPaymentDto);
    return await this.paymentsRepository.save(appointment);
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
    const appointment = await this.findOne(id);

    const updatedAppointment = this.paymentsRepository.merge(
      appointment,
      updatePaymentDto,
    );

    return await this.paymentsRepository.save(updatedAppointment);
  }

  /**
   * Elimina una reserva de la base de datos de manera permanente.
   * @param id Identificador de la reserva a eliminar.
   * @throws NotFoundException Si la   reserva no existe.
   * @returns Un objeto con un mensaje de éxito.
   */
  async remove(id: number) {
    // Verificamos existencia antes de intentar borrar
    const appointment = await this.findOne(id);

    await this.paymentsRepository.remove(appointment);

    return { message: `Pago ${id} eliminado correctamente` };
  }
}