import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, JoinColumn, OneToMany } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { BookingEntity } from '../bookings/booking.entity';

/**
 * Entidad 'Business'.
 * Representa la tabla 'business' en la base de datos SQLite.
 * Almacena la información de las empresas pertenecientes a los usuarios.
 */
@Entity('business')
export class Business {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre de la empresa. */
  @Column()
  nombre: string;

  /** Ubicación física o dirección de la empresa. */
  @Column({ nullable: true })
  direccion: string;

  /** Teléfono de contacto de la empresa. */
  @Column({ nullable: true })
  telefono: string;

  /** ID del usuario propietario de la empresa (Jefe/Admin). */
  @Column()
  usuarioId: number;

  /** Relación con el Jefe (Admin) que posee esta empresa. */
  @ManyToOne(() => Usuario, (usuario) => usuario.empresas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  /** ID de la cuenta de usuario propia de la empresa (para que el local pueda loguearse). */
  @Column({ unique: true, nullable: true })
  businessUserId: number;

  /** Cuenta de usuario asociada exclusivamente a este local/empresa. */
  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessUserId' })
  businessUser: Usuario;

  /** Lista de reservas asociadas a esta empresa. */
  @OneToMany(() => BookingEntity, (appointment) => appointment.businessId)
  appointments: BookingEntity[];
}
