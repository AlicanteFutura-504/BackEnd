import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  /**
   * Crea y guarda un nuevo usuario en la base de datos.
   * @param nombre Nombre del usuario.
   * @param contrasena Contraseña del usuario.
   * @returns El usuario creado.
   */
  async crearUsuario(nombre: string, contrasena: string): Promise<Usuario> {
    const nuevoUsuario = this.usuariosRepository.create({
      nombre,
      contrasena,
    });
    return this.usuariosRepository.save(nuevoUsuario);
  }

  /**
   * Valida un usuario verificando si coincide con 'root' o si existe en la base de datos.
   */
  async validarUsuario(nombre: string, contrasena: string): Promise<Usuario | null> {
    if (nombre === 'root' && contrasena === 'root') {
      const rootUser = new Usuario();
      rootUser.id = 0;
      rootUser.nombre = 'root';
      rootUser.contrasena = 'root';
      return rootUser;
    }

    return this.usuariosRepository.findOne({
      where: { nombre, contrasena },
    });
  }
}

