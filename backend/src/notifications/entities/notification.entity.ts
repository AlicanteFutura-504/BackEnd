import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../usuarios/usuario.entity';
import { BookingEntity } from '../../bookings/booking.entity';
import { Review } from '../../property/review.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Usuario;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column()
  type: string; // 'booking_created', 'booking_confirmed', 'booking_cancelled'

  @Column({ nullable: true })
  bookingId: number;

  @ManyToOne(() => BookingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;

  @Column({ nullable: true })
  reviewId: number;

  @ManyToOne(() => Review, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewId' })
  review: Review;

  @Column({ nullable: true })
  link: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
