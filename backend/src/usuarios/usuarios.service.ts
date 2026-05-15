import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, UserRole } from './usuario.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

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
      select: ['id', 'username', 'email', 'contrasena', 'role', 'nombreCompleto', 'dni'], // Añadimos campos necesarios
    });
  }

  /**
   * Actualiza los datos de un usuario.
   */
  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Si se intenta cambiar username, email o dni, verificar que no existan ya
    if (dto.username || dto.email || dto.dni) {
      const conflictCheck = await this.usuariosRepository.findOne({
        where: [
          ...(dto.username ? [{ username: dto.username }] : []),
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.dni ? [{ dni: dto.dni }] : []),
        ],
      });

      if (conflictCheck && conflictCheck.id !== id) {
        throw new ConflictException('El nombre de usuario, email o DNI ya está en uso');
      }
    }

    // Si hay contraseña, encriptarla
    if (dto.contrasena) {
      dto.contrasena = await bcrypt.hash(dto.contrasena, 10);
    }

    Object.assign(usuario, dto);
    return this.usuariosRepository.save(usuario);
  }
}

