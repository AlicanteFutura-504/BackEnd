import { Column, Entity, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Business } from '../business/business.entity';
import { Payment } from '../payments/payments.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('appointment')
@Unique(['date', 'time', 'businessId'])
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column()
  time: string;

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
  businessId: number;

  @ManyToOne(() => Business, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  serviceName: string;

  @OneToOne(() => Payment, payment => payment.booking, { eager: true, cascade: true })
  payment: Payment;
}
