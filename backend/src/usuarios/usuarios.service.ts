import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, UserRole } from './usuario.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  /**
   * Crea un nuevo usuario con la contraseña encriptada.
   */
  async crearUsuario(
    username: string,
    email: string,
    contrasena: string,
    role: UserRole = UserRole.BUSINESS,
    nombreCompleto?: string,
    dni?: string,
  ): Promise<Usuario> {
    const existing = await this.usuariosRepository.findOne({
      where: [{ username }, { email }, { dni: dni || 'N/A' }],
    });

    if (existing) {
      throw new ConflictException('El usuario, email o DNI ya existe en el sistema');
    }

    const hashedContrasena = await bcrypt.hash(contrasena, 10);

    const nuevoUsuario = this.usuariosRepository.create({
      username,
      email,
      contrasena: hashedContrasena,
      role,
      nombreCompleto,
      dni,
    });

    return this.usuariosRepository.save(nuevoUsuario);
  }

  /**
   * Busca un usuario por su nombre de usuario o email para validación de login.
   */
  async findByIdentifier(identifier: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      select: ['id', 'username', 'email', 'contrasena', 'role'], // Necesitamos contrasena para compare
    });
  }
}

