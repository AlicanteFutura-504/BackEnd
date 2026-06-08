import { Column, Entity, OneToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { BookingEntity } from '../bookings/booking.entity';

/**
 * Enumeración que define los tipos de pago.
 */
export enum PaymentType {
  CARD = 'tarjeta',
  CASH = 'efectivo',
  BIZUM = 'bizum',
  TRANSFER = 'transferencia',
  PENDING = 'pendiente',
}

/**
 * Enumeración que define los estados de pago.
 */
export enum PaymentStatus {
  PAID = 'pagado',
  PENDING = 'pendiente',
}

/**
 * Entidad 'Payment'.
 * Representa un registro de pago en el sistema.
 */
@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: true })
  date: string;

  @Column({
    type: 'text',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'text',
    default: PaymentType.CARD,
  })
  type: PaymentType;

  /** Relación con la reserva, desde la cual se pueden obtener los datos del cliente y del negocio. */
  @Column({ nullable: true })
  bookingId: number;

  @OneToOne(() => BookingEntity, booking => booking.payment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;

  @Column()
  amount: number;
}