import { Column, Entity, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Property } from '../property/property.entity';
import { Payment } from '../payments/payments.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  MODIFIED = 'modified',
  CANCELLED = 'cancelled',
}

@Entity('booking')
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  checkInDate: string;

  @Column({ type: 'date' })
  checkOutDate: string;

  @Column({
    type: 'text',
    default: BookingStatus.PENDING,
  })
  status: string;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @OneToOne(() => Payment, payment => payment.booking, { eager: true, cascade: true })
  payment: Payment;
}
