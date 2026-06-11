import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { Review } from './review.entity';
import { BookingEntity, BookingStatus } from '../bookings/booking.entity';

import { UsuariosService } from '../usuarios/usuarios.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Crea una nueva propiedad.
   */
  async crearEmpresa(dto: CreatePropertyDto): Promise<Property> {
    const { nombre, city, address, telefono, usuarioId } = dto;

    const nuevaPropiedad = this.propertyRepository.create({
      nombre,
      city,
      address,
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
    filterValue?: string,
  ): Promise<{ data: Property[]; total: number }> {
    const query = this.propertyRepository.createQueryBuilder('property');

    if (
      role === UserRole.SUPERADMIN ||
      role === UserRole.GUEST ||
      role === UserRole.ADMIN
    ) {
      if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
        query.leftJoinAndSelect('property.host', 'usuario');
      }
    } else if (role === UserRole.HOST) {
      query.where('property.usuarioId = :userId', { userId });
    } else {
      query.where('1 = 0'); // Fallback si no tiene rol conocido
    }

    if (search) {
      const searchCondition =
        '(LOWER(property.nombre) LIKE LOWER(:search) OR LOWER(property.city) LIKE LOWER(:search) OR LOWER(property.address) LIKE LOWER(:search) OR LOWER(property.telefono) LIKE LOWER(:search))';

      if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
        query.andWhere(
          `(${searchCondition} OR LOWER(usuario.nombreCompleto) LIKE LOWER(:search) OR LOWER(usuario.username) LIKE LOWER(:search))`,
          { search: `%${search}%` },
        );
      } else {
        query.andWhere(searchCondition, { search: `%${search}%` });
      }
    }

    // Specific filters
    if (filterField && filterValue) {
      if (filterField === 'has_phone') {
        if (filterValue === 'true')
          query.andWhere('property.telefono IS NOT NULL');
        else query.andWhere('property.telefono IS NULL');
      } else if (filterField === 'has_address') {
        if (filterValue === 'true')
          query.andWhere('property.address IS NOT NULL');
        else query.andWhere('property.address IS NULL');
      } else {
        query.andWhere(
          `LOWER(property.${filterField}) LIKE LOWER(:filterValue)`,
          { filterValue: `%${filterValue}%` },
        );
      }
    }

    // Sorting
    const allowedSortFields = [
      'id',
      'nombre',
      'city',
      'address',
      'telefono',
      'pricePerNight',
      'maxGuests',
    ];
    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`property.${sortBy}`, sortOrder);
    } else {
      query.orderBy('property.id', 'DESC');
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Attach scores
    for (const p of data) {
      const scoreObj = await this.getPropertyScore(p.id);
      (p as any).score = scoreObj.average;
      (p as any).isPromoted = scoreObj.isPromoted;
    }

    // Sort by score or push promoted properties to the top
    data.sort((a: any, b: any) => {
      if (sortBy === 'score') {
        return sortOrder === 'DESC' ? b.score - a.score : a.score - b.score;
      }
      return (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0);
    });

    return { data, total };
  }

  async getPropertyScore(
    propertyId: number,
  ): Promise<{ average: number; isPromoted: boolean }> {
    const result = await this.reviewRepository
      .createQueryBuilder('r')
      .select('AVG(r.score)', 'avgRating')
      .where('r.propertyId = :propertyId', { propertyId })
      .getRawOne();

    const avgRating = result?.avgRating;
    const average = parseFloat(avgRating) || 0;
    const isPromoted = average >= 4.5;
    return { average, isPromoted };
  }

  async findOne(
    id: number,
    userId: number,
    role: UserRole,
    username?: string,
  ): Promise<Property> {
    const where: any = { id };

    // Si NO es SUPERADMIN o GUEST o ADMIN, aplicamos las reglas de tenencia
    if (
      role !== UserRole.SUPERADMIN &&
      role !== UserRole.GUEST &&
      role !== UserRole.ADMIN
    ) {
      if (role === UserRole.HOST) {
        where.usuarioId = userId;
      }
    }

    const property = await this.propertyRepository.findOne({
      where,
      relations:
        role === UserRole.SUPERADMIN || role === UserRole.ADMIN ? ['host'] : [],
    });

    if (!property) {
      throw new NotFoundException(
        `Property with ID ${id} not found or access denied`,
      );
    }

    const scoreObj = await this.getPropertyScore(property.id);
    (property as any).score = scoreObj.average;
    (property as any).isPromoted = scoreObj.isPromoted;

    // Regla de privacidad de la dirección
    let showAddress = false;
    if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
      showAddress = true;
    } else if (role === UserRole.HOST && property.usuarioId === userId) {
      showAddress = true;
    } else if (role === UserRole.GUEST) {
      const confirmedBooking = await this.bookingRepository.findOne({
        where: [
          {
            propertyId: property.id,
            usuarioId: userId,
            status: BookingStatus.CONFIRMED,
          },
          {
            propertyId: property.id,
            usuarioId: userId,
            status: BookingStatus.COMPLETED,
          },
        ],
      });
      if (confirmedBooking) showAddress = true;
    }

    if (!showAddress) {
      property.address = undefined as any;
    }

    return property;
  }

  async update(
    id: number,
    updatePropertyDto: UpdatePropertyDto,
    userId: number,
    role: UserRole,
    username?: string,
  ): Promise<Property> {
    const property = await this.findOne(id, userId, role, username);
    await this.propertyRepository.update(id, updatePropertyDto);
    return this.findOne(id, userId, role, username);
  }

  async remove(
    id: number,
    userId: number,
    role: UserRole,
    username?: string,
  ): Promise<void> {
    const property = await this.findOne(id, userId, role, username);
    await this.propertyRepository.delete(id);
  }

  async findReviewsByProperty(propertyId: number): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { propertyId },
      relations: ['guest'],
      order: { createdAt: 'DESC' },
    });
  }

  async createReview(
    propertyId: number,
    guestId: number,
    score: number,
    comment: string,
  ): Promise<Review> {
    // Verificar que el huésped tenga una reserva confirmada o completada
    const hasBooking = await this.bookingRepository.findOne({
      where: [
        { propertyId, usuarioId: guestId, status: BookingStatus.CONFIRMED },
        { propertyId, usuarioId: guestId, status: BookingStatus.COMPLETED },
      ],
    });

    if (!hasBooking) {
      throw new BadRequestException(
        'Solo puedes dejar una reseña si tienes una reserva confirmada o completada para esta propiedad.',
      );
    }

    if (score < 1 || score > 5) {
      throw new BadRequestException('La puntuación debe estar entre 1 y 5.');
    }

    const review = this.reviewRepository.create({
      propertyId,
      guestId,
      score,
      comment: comment || '',
    });

    return this.reviewRepository.save(review);
  }
}
