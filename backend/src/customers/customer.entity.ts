import { Column, Entity, OneToMany, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';

/**
 * Entidad 'Customer'.
 * Representa a los clientes finales que realizan las reservas.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  surname: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;


  /** Una lista de todas las reservas realizadas por este cliente. */
  @OneToMany(() => Appointment, (appointment) => appointment.customer)
  appointments: Appointment[];
}
