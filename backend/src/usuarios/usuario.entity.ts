import { Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne } from 'typeorm';
import { Business } from '../business/business.entity';

/**
 * Roles de usuario en el sistema.
 */
export enum UserRole {
  ADMIN = 'admin',      // Jefe / Empresario
  BUSINESS = 'business', // Empresa (creada por el admin)
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

  /** Contraseña almacenada en formato hash (bcrypt). */
  @Column({ select: false }) // Por seguridad, no se devuelve en consultas por defecto
  contrasena: string;

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
