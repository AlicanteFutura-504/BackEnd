import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
}

@Entity()
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
  customerId: number;

  @Column()
  businessId: number;

  @Column()
  serviceName: string;
}
