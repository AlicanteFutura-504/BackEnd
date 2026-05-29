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

  async findAll(
    userId: number, 
    role: UserRole, 
    username?: string, 
    page: number = 1, 
    limit: number = 20, 
    search: string = '',
    sortBy: string = 'id',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    filterField?: string,
    filterValue?: string
  ): Promise<{ data: Business[], total: number }> {
    const query = this.businessRepository.createQueryBuilder('business');
    
    if (role === UserRole.SUPERADMIN) {
      query.leftJoinAndSelect('business.usuario', 'usuario');
    } else if (role === UserRole.ADMIN) {
      query.where('business.usuarioId = :userId', { userId });
    } else if (role === UserRole.BUSINESS) {
      query.where('business.businessUserId = :userId', { userId });
    } else {
      query.where('1 = 0'); // Fallback si no tiene rol conocido
    }

    if (search) {
      const searchCondition = '(LOWER(business.nombre) LIKE LOWER(:search) OR LOWER(business.direccion) LIKE LOWER(:search) OR LOWER(business.telefono) LIKE LOWER(:search))';
      
      if (role === UserRole.SUPERADMIN) {
        query.andWhere(`(${searchCondition} OR LOWER(usuario.nombreCompleto) LIKE LOWER(:search) OR LOWER(usuario.username) LIKE LOWER(:search))`, { search: `%${search}%` });
      } else {
        query.andWhere(searchCondition, { search: `%${search}%` });
      }
    }

    // Specific filters
    if (filterField && filterValue) {
      if (filterField === 'has_phone') {
        if (filterValue === 'true') query.andWhere('business.telefono IS NOT NULL');
        else query.andWhere('business.telefono IS NULL');
      } else if (filterField === 'has_address') {
        if (filterValue === 'true') query.andWhere('business.direccion IS NOT NULL');
        else query.andWhere('business.direccion IS NULL');
      } else {
        query.andWhere(`LOWER(business.${filterField}) LIKE LOWER(:filterValue)`, { filterValue: `%${filterValue}%` });
      }
    }

    // Sorting
    const allowedSortFields = ['id', 'nombre', 'direccion', 'telefono'];
    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`business.${sortBy}`, sortOrder);
    } else {
      query.orderBy('business.id', 'DESC');
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number, userId: number, role: UserRole, username?: string): Promise<Business> {
    const where: any = { id };
    
    // Si NO es SUPERADMIN, aplicamos las reglas de tenencia
    if (role !== UserRole.SUPERADMIN) {
      if (role === UserRole.ADMIN) {
        where.usuarioId = userId;
      } else if (role === UserRole.BUSINESS) {
        where.businessUserId = userId;
      }
    }

    const business = await this.businessRepository.findOne({ 
      where,
      relations: role === UserRole.SUPERADMIN ? ['usuario'] : []
    });
    
    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found or access denied`);
    }
    return business;
  }

  async update(id: number, updateBusinessDto: UpdateBusinessDto, userId: number, role: UserRole, username?: string): Promise<Business> {
    const business = await this.findOne(id, userId, role, username);
    await this.businessRepository.update(id, updateBusinessDto);
    return this.findOne(id, userId, role, username);
  }

  async remove(id: number, userId: number, role: UserRole, username?: string): Promise<void> {
    const business = await this.findOne(id, userId, role, username);
    await this.businessRepository.delete(id);
  }
}
