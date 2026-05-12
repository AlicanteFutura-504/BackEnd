import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

/**
 * Servicio encargado de gestionar la lógica de negocio de las reservas.
 * Actúa como intermediario entre el controlador y la base de datos (TypeORM).
 */
@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  /**
   * Obtiene todas las reservas de la base de datos.
   * Las devuelve ordenadas por fecha y hora de forma ascendente.
   * @returns Lista completa de reservas (Appointment[])
   */
  async findAll() {
    return await this.appointmentsRepository.find({
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  /**
   * Busca una reserva específica utilizando su ID.
   * Lanzará una excepción si la reserva no existe.
   * @param id El identificador único de la reserva.
   * @throws NotFoundException si no se encuentra la reserva.
   * @returns La reserva encontrada.
   */
  async findOne(id: number) {
    const appointment = await this.appointmentsRepository.findOneBy({ id });
    
    if (!appointment) {
      throw new NotFoundException(`No existe la reserva con id ${id}`);
    }
    
    return appointment;
  }

  /**
   * Crea una nueva reserva en el sistema y la guarda en la base de datos.
   * Incluye validaciones para evitar fechas pasadas y citas duplicadas en el mismo horario.
   * @param createAppointmentDto Los datos validados provenientes de la petición.
   * @throws BadRequestException si la fecha es pasada o el horario ya está ocupado.
   * @returns La nueva reserva creada con su ID asignado.
   */
  async create(createAppointmentDto: CreateAppointmentDto) {
    const { date, time, businessId } = createAppointmentDto;

    // 1. Validación: Evitar reservas en fechas pasadas
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException('No se pueden realizar reservas en fechas pasadas.');
    }

    // 2. Validación: Evitar duplicados (mismo negocio, mismo día, misma hora)
    const isSlotBusy = await this.appointmentsRepository.findOne({
      where: { date, time, businessId },
    });

    if (isSlotBusy) {
      throw new BadRequestException('Este horario ya se encuentra reservado para este establecimiento.');
    }

    const appointment = this.appointmentsRepository.create(createAppointmentDto);
    return await this.appointmentsRepository.save(appointment);
  }

  /**
   * Actualiza parcialmente una reserva existente.
   * @param id Identificador de la reserva a modificar.
   * @param updateAppointmentDto Campos a actualizar.
   * @throws NotFoundException Si la reserva no existe.
   * @returns La reserva con los datos actualizados.
   */
  async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    // Verificamos existencia usando el método findOne ya definido
    const appointment = await this.findOne(id);

    const updatedAppointment = this.appointmentsRepository.merge(
      appointment,
      updateAppointmentDto,
    );

    return await this.appointmentsRepository.save(updatedAppointment);
  }

  /**
   * Elimina una reserva de la base de datos de manera permanente.
   * @param id Identificador de la reserva a eliminar.
   * @throws NotFoundException Si la reserva no existe.
   * @returns Un objeto con un mensaje de éxito.
   */
  async remove(id: number) {
    // Verificamos existencia antes de intentar borrar
    const appointment = await this.findOne(id);

    await this.appointmentsRepository.remove(appointment);

    return { message: `Reserva ${id} eliminada correctamente` };
  }
}