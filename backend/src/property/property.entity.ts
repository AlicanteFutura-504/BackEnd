import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { BookingEntity } from '../bookings/booking.entity';

/**
 * Entidad 'Property'.
 * Representa la tabla 'property' en la base de datos.
 * Almacena la información de los apartamentos vacacionales pertenecientes a los anfitriones.
 */
@Entity('property')
export class Property {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre de la empresa. */
  @Column()
  nombre: string;

  /** Ciudad de la propiedad. */
  @Column({ nullable: true })
  city: string;

  /** Dirección exacta de la propiedad. */
  @Column({ nullable: true })
  address: string;

  /** Teléfono de contacto de la empresa. */
  @Column({ nullable: true })
  telefono: string;

  /** ID del usuario propietario de la empresa (Jefe/Admin). */
  @Column()
  usuarioId: number;

  /** Descripción detallada del apartamento. */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Precio por noche de la estancia. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricePerNight: number;

  /** Número máximo de huéspedes permitidos. */
  @Column({ type: 'int', default: 1 })
  maxGuests: number;

  /** Lista de comodidades (Wifi, Piscina, etc.). Se guarda como JSON o texto. */
  @Column({ type: 'jsonb', nullable: true })
  amenities: string[];

  /** URLs de las imágenes de la propiedad. */
  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  /** Relación con el Anfitrión (Host) que posee esta propiedad. */
  @ManyToOne(() => Usuario, (usuario) => usuario.properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuarioId' })
  host: Usuario;

  /** Lista de reservas asociadas a esta propiedad. */
  @OneToMany(() => BookingEntity, (appointment) => appointment.property)
  appointments: BookingEntity[];
}
