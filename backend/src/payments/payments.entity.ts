import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Enumeración que define los estados posibles en los que puede encontrarse una reserva.
 */
export enum PaymentStatus {
  PENDING = 'pending',     // Pendiente de confirmación o de que llegue la fecha
  CONFIRMED = 'confirmed', // Confirmada por la empresa
  PAID = 'paid',           // El cliente ha pagado el servicio
}

/**
 * Entidad 'Payment'.
 * Esta clase representa la tabla 'payment' dentro de la base de datos SQLite.
 * Cada instancia de esta clase será una fila de la tabla (un registro).
 */
@Entity()
export class Payment {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Fecha del pago. */
  @Column({ type: 'date' })
  date: string;

  /** Hora del pago. */
  @Column()
  time: string;

  /** Estado actual del pago, por defecto siempre se inician en estado pendiente. */
  @Column({
    type: 'text',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /** Relación (almacenada como número entero) del cliente que realiza el pago. */
  @Column()
  customerId: number;

  /** Identificador de la empresa o local en el que se ejecuta el pago. */
  @Column()
  businessId: number;

  /** Texto descriptivo del servicio realizado (ej: Corte de pelo). */
  @Column()
  serviceName: string;
}