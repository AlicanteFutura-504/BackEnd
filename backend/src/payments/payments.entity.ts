import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Business } from '../business/business.entity';

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

  /** 
   * Nombre del cliente (De-normalizado). 
   * Se recomienda que sea el nombre completo (name + surname) del Customer 
   * para facilitar listados históricos si el cliente se borra.
   */
  @Column()
  clientName: string;

  /** Relación opcional con la entidad Customer. */
  @Column({ nullable: true })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  businessName: string;

  /** Relación con la entidad Business. */
  @Column({ nullable: true })
  businessId: number;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  amount: number;
}