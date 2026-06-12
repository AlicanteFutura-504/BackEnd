import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { BookingEntity as Booking } from '../bookings/booking.entity';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column()
  senderId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'senderId' })
  sender: Usuario;

  @Column()
  receiverId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'receiverId' })
  receiver: Usuario;

  @Column({ nullable: true })
  bookingId: number;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
}
