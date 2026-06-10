import { Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne } from 'typeorm';
import { Property } from '../property/property.entity';

/**
 * Roles de usuario en el sistema.
 */
export enum UserRole {
  SUPERADMIN = 'superadmin', // Desarrolladores / Dueños del SaaS
  ADMIN = 'admin',           // Gestión de la plataforma
  HOST = 'host',             // Anfitrión (dueño de propiedades)
  GUEST = 'guest',           // Huésped que hace reservas
}

/**
 * Entidad 'Usuario'.
 * Almacena la información de acceso y el rol del usuario.
 */
@Entity('usuarios')
export class Usuario {
  /** Clave primaria autoincremental. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre de usuario para login. */
  @Column({ unique: true })
  username: string;

  /** Nombre completo de la persona física. */
  @Column({ nullable: true })
  nombreCompleto: string;

  /** DNI/NIE único del usuario. */
  @Column({ unique: true, nullable: true })
  dni: string;

  /** Correo electrónico único. */
  @Column({ unique: true })
  email: string;

  /** Teléfono del usuario. */
  @Column({ nullable: true })
  phone: string;

  /** Contraseña almacenada en formato hash (bcrypt). */
  @Column({ select: false }) // Por seguridad, no se devuelve en consultas por defecto
  contrasena: string;

  /** URL de la foto de perfil del usuario. */
  @Column({ nullable: true })
  profilePicture: string;

  /** Rol asignado al usuario. */
  @Column({
    type: 'text',
    default: UserRole.GUEST,
  })
  role: UserRole;

  /** Propiedades asociadas (si el rol es HOST). */
  @OneToMany(() => Property, (property) => property.host)
  properties: Property[];
}
