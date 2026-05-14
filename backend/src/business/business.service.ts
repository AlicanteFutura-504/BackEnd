import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './business.entity';

import { UsuariosService } from '../usuarios/usuarios.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Crea una nueva empresa y su cuenta de usuario asociada.
   */
  async crearEmpresa(dto: CreateBusinessDto): Promise<Business> {
    const { nombre, direccion, telefono, username, email, contrasena, usuarioId } = dto;

    // 1. Crear el usuario con rol BUSINESS
    const businessUser = await this.usuariosService.crearUsuario(
      username,
      email,
      contrasena,
      UserRole.BUSINESS,
    );

    // 2. Crear el perfil de la empresa vinculado al Jefe y a su propia cuenta
    const nuevaEmpresa = this.businessRepository.create({
      nombre,
      direccion,
      telefono,
      usuarioId,
      businessUserId: businessUser.id,
    });

    return this.businessRepository.save(nuevaEmpresa);
  }
}
