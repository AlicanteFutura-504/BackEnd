import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './business.entity';

import { UsuariosService } from '../usuarios/usuarios.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Crea una nueva propiedad.
   */
  async crearEmpresa(dto: CreateBusinessDto): Promise<Property> {
    const { nombre, direccion, telefono, usuarioId } = dto;

    const nuevaPropiedad = this.propertyRepository.create({
      nombre,
      direccion,
      telefono,
      usuarioId,
    });

    return this.propertyRepository.save(nuevaPropiedad);
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
  ): Promise<{ data: Property[], total: number }> {
    const query = this.propertyRepository.createQueryBuilder('property');
    
    if (role === UserRole.SUPERADMIN || role === UserRole.GUEST || role === UserRole.ADMIN) {
      if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
        query.leftJoinAndSelect('property.host', 'usuario');
      }
    } else if (role === UserRole.HOST) {
      query.where('property.usuarioId = :userId', { userId });
    } else {
      query.where('1 = 0'); // Fallback si no tiene rol conocido
    }

    if (search) {
      const searchCondition = '(LOWER(property.nombre) LIKE LOWER(:search) OR LOWER(property.direccion) LIKE LOWER(:search) OR LOWER(property.telefono) LIKE LOWER(:search))';
      
      if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
        query.andWhere(`(${searchCondition} OR LOWER(usuario.nombreCompleto) LIKE LOWER(:search) OR LOWER(usuario.username) LIKE LOWER(:search))`, { search: `%${search}%` });
      } else {
        query.andWhere(searchCondition, { search: `%${search}%` });
      }
    }

    // Specific filters
    if (filterField && filterValue) {
      if (filterField === 'has_phone') {
        if (filterValue === 'true') query.andWhere('property.telefono IS NOT NULL');
        else query.andWhere('property.telefono IS NULL');
      } else if (filterField === 'has_address') {
        if (filterValue === 'true') query.andWhere('property.direccion IS NOT NULL');
        else query.andWhere('property.direccion IS NULL');
      } else {
        query.andWhere(`LOWER(property.${filterField}) LIKE LOWER(:filterValue)`, { filterValue: `%${filterValue}%` });
      }
    }

    // Sorting
    const allowedSortFields = ['id', 'nombre', 'direccion', 'telefono', 'pricePerNight', 'maxGuests'];
    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`property.${sortBy}`, sortOrder);
    } else {
      query.orderBy('property.id', 'DESC');
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number, userId: number, role: UserRole, username?: string): Promise<Property> {
    const where: any = { id };
    
    // Si NO es SUPERADMIN o GUEST o ADMIN, aplicamos las reglas de tenencia
    if (role !== UserRole.SUPERADMIN && role !== UserRole.GUEST && role !== UserRole.ADMIN) {
      if (role === UserRole.HOST) {
        where.usuarioId = userId;
      }
    }

    const property = await this.propertyRepository.findOne({ 
      where,
      relations: role === UserRole.SUPERADMIN || role === UserRole.ADMIN ? ['host'] : []
    });
    
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found or access denied`);
    }
    return property;
  }

  async update(id: number, updateBusinessDto: UpdateBusinessDto, userId: number, role: UserRole, username?: string): Promise<Property> {
    const property = await this.findOne(id, userId, role, username);
    await this.propertyRepository.update(id, updateBusinessDto);
    return this.findOne(id, userId, role, username);
  }

  async remove(id: number, userId: number, role: UserRole, username?: string): Promise<void> {
    const property = await this.findOne(id, userId, role, username);
    await this.propertyRepository.delete(id);
  }
}
