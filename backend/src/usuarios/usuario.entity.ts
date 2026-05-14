import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Business } from '../business/business.entity';

/**
 * Entidad 'Usuario'.
 * Esta clase representa la tabla 'usuarios' dentro de la base de datos SQLite.
 * Almacena la información de los usuarios para el inicio de sesión.
 */
@Entity('usuarios')
export class Usuario {
  /** Clave primaria autoincremental de la base de datos. */
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre del usuario. */
  @Column()
  nombre: string;

  /** Contraseña del usuario. */
  @Column()
  contrasena: string;

  /** Empresas asociadas a este usuario (Relación 1 a muchos). */
  @OneToMany(() => Business, (business) => business.usuario)
  empresas: Business[];
}
