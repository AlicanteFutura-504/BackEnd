import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './business.entity';

import { UsuariosService } from '../usuarios/usuarios.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
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

  async findAll(userId: number, role: UserRole): Promise<Business[]> {
    if (role === UserRole.ADMIN) {
      return this.businessRepository.find({ where: { usuarioId: userId } });
    } else if (role === UserRole.BUSINESS) {
      return this.businessRepository.find({ where: { businessUserId: userId } });
    }
    return [];
  }

  async findOne(id: number, userId: number, role: UserRole): Promise<Business> {
    const where: any = { id };
    if (role === UserRole.ADMIN) {
      where.usuarioId = userId;
    } else if (role === UserRole.BUSINESS) {
      where.businessUserId = userId;
    }
    const business = await this.businessRepository.findOne({ where });
    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found or access denied`);
    }
    return business;
  }

  async update(id: number, updateBusinessDto: UpdateBusinessDto, userId: number, role: UserRole): Promise<Business> {
    const business = await this.findOne(id, userId, role);
    await this.businessRepository.update(id, updateBusinessDto);
    return this.findOne(id, userId, role);
  }

  async remove(id: number, userId: number, role: UserRole): Promise<void> {
    const business = await this.findOne(id, userId, role);
    await this.businessRepository.delete(id);
  }
}
