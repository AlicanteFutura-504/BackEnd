import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, JoinColumn } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Business } from '../business/business.entity';

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
 * Representa una cita o reserva. 
 * Se ha añadido una restricción de unicidad para evitar dobles reservas.
 */
@Entity()
@Unique(['date', 'time', 'businessId']) 
export class Appointment {
  /** Clave primaria autoincremental. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Fecha (YYYY-MM-DD). */
  @Column({ type: 'date' })
  date: string;

  /** Hora (HH:mm). */
  @Column()
  time: string;

  /** Estado actual de la reserva. */
  @Column({
    type: 'text',
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  /** ID del cliente (Columna física). */
  @Column()
  customerId: number;

  /** Relación con el Cliente. */
  @ManyToOne(() => Customer, (customer) => customer.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  /** ID del negocio (Columna física). */
  @Column()
  businessId: number;

  /** Relación con el Negocio. */
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  /** Texto descriptivo del servicio solicitado. */
  @Column()
  serviceName: string;
}