import { Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne } from 'typeorm';
import { Business } from '../business/business.entity';

/**
 * Roles de usuario en el sistema.
 */
export enum UserRole {
  SUPERADMIN = 'superadmin', // Desarrolladores / Dueños del SaaS
  ADMIN = 'admin',           // Jefe / Empresario
  BUSINESS = 'business',     // Empresa (local creado por el admin)
  CLIENT = 'client',         // Cliente que hace reservas
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
    default: UserRole.BUSINESS,
  })
  role: UserRole;

  /** Empresas asociadas (si el rol es ADMIN). */
  @OneToMany(() => Business, (business) => business.usuario)
  empresas: Business[];

  /** Perfil de empresa asociado (si el rol es BUSINESS). */
  @OneToOne(() => Business, (business) => business.businessUser)
  businessProfile: Business;
}
