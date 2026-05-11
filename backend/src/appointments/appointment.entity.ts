import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Enumeración que define los estados posibles en los que puede encontrarse una reserva.
 */
export enum AppointmentStatus {
  PENDING = 'pending',     // Pendiente de confirmación o de que llegue la fecha
  CONFIRMED = 'confirmed', // Confirmada por la empresa
  PAID = 'paid',           // El cliente ha pagado el servicio
}

/**
 * Entidad 'Appointment'.
 * Esta clase representa la tabla 'appointment' dentro de la base de datos SQLite.
 * Cada instancia de esta clase será una fila de la tabla (un registro).
 */
@Entity()
export class Appointment {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Fecha para la que está solicitada la reserva. */
  @Column({ type: 'date' })
  date: string;

  /** Hora a la que el cliente ha solicitado su reserva. */
  @Column()
  time: string;

  /** Estado actual de la reserva, por defecto siempre se inician en estado pendiente. */
  @Column({
    type: 'text',
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  /** Relación (almacenada como número entero) del cliente que hace la solicitud. */
  @Column()
  customerId: number;

  /** Identificador de la empresa o local en el que se ejecuta la reserva. */
  @Column()
  businessId: number;

  /** Texto descriptivo del servicio solicitado (ej: Corte de pelo). */
  @Column()
  serviceName: string;
}