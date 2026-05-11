import { Injectable, NotFoundException } from '@nestjs/common';
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
  findAll() {
    return this.appointmentsRepository.find({
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  /**
   * Busca una reserva específica utilizando su ID.
   * @param id El identificador único de la reserva.
   * @returns La reserva encontrada o un valor nulo si no existe.
   */
  findOne(id: number) {
    return this.appointmentsRepository.findOneBy({ id });
  }

  /**
   * Crea una nueva reserva en el sistema y la guarda en la base de datos.
   * @param createAppointmentDto Los datos validados provenientes de la petición.
   * @returns La nueva reserva creada con su ID asignado.
   */
  create(createAppointmentDto: CreateAppointmentDto) {
    const appointment = this.appointmentsRepository.create(createAppointmentDto);
    return this.appointmentsRepository.save(appointment);
  }

  /**
   * Actualiza parcialmente una reserva existente.
   * @param id Identificador de la reserva a modificar.
   * @param updateAppointmentDto Campos a actualizar.
   * @throws NotFoundException Si la reserva no existe.
   * @returns La reserva con los datos actualizados.
   */
  async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.appointmentsRepository.findOneBy({ id });

    if (!appointment) {
      throw new NotFoundException(`No existe la reserva con id ${id}`);
    }

    const updatedAppointment = this.appointmentsRepository.merge(
      appointment,
      updateAppointmentDto,
    );

    return this.appointmentsRepository.save(updatedAppointment);
  }

  /**
   * Elimina una reserva de la base de datos de manera permanente.
   * @param id Identificador de la reserva a eliminar.
   * @throws NotFoundException Si la reserva no existe.
   * @returns Un objeto con un mensaje de éxito.
   */
  async remove(id: number) {
    const appointment = await this.appointmentsRepository.findOneBy({ id });

    if (!appointment) {
      throw new NotFoundException(`No existe la reserva con id ${id}`);
    }

    await this.appointmentsRepository.remove(appointment);

    return { message: `Reserva ${id} eliminada correctamente` };
  }
}