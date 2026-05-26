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

  /** ID del negocio para aislar clientes por negocio */
  @Column({ nullable: true })
  businessId: number;

  /** Relación opcional con Business */
  @ManyToOne('Business', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: any; // Usar 'any' temporalmente si no queremos importar la entidad Business para evitar dependencias circulares

  /** Una lista de todas las reservas realizadas por este cliente. */
  @OneToMany(() => Appointment, (appointment) => appointment.customer)
  appointments: Appointment[];
}
