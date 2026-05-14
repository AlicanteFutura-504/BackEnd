import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

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

  /** Contraseña para el inicio de sesión de los empleados en la empresa. */
  @Column()
  contrasena: string;

  /** ID del usuario propietario de la empresa. */
  @Column()
  usuarioId: number;

  /** Relación ManyToOne con la entidad Usuario (1 Usuario tiene muchas empresas). */
  @ManyToOne(() => Usuario, (usuario) => usuario.empresas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;
}
