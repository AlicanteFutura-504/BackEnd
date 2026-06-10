import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('guest_rating')
export class GuestRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guestId: number;

  @Column()
  hostId: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guestId' })
  guest: Usuario;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: Usuario;
}
