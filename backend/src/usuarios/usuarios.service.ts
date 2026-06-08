import { Injectable, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, UserRole } from './usuario.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService implements OnModuleInit {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async onModuleInit() {
    await this.seedRootUser();
  }

  private async seedRootUser() {
    const rootUser = await this.usuariosRepository.findOne({ where: { username: 'root' } });
    if (!rootUser) {
      const hashedContrasena = await bcrypt.hash('root', 10);
      const nuevoRoot = this.usuariosRepository.create({
        username: 'root',
        email: 'root@yoku.com',
        contrasena: hashedContrasena,
        role: UserRole.SUPERADMIN,
        nombreCompleto: 'Super Admin (Developer)',
      });
      await this.usuariosRepository.save(nuevoRoot);
      this.logger.log('Root user created successfully');
    } else {
      this.logger.log('Root user already exists');
    }
  }

  /**
   * Crea un nuevo usuario con la contraseña encriptada.
   */
  async crearUsuario(
    username: string,
    email: string,
    contrasena: string,
    role: UserRole = UserRole.HOST,
    nombreCompleto?: string,
    dni?: string,
    phone?: string,
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
      phone,
    });

    return this.usuariosRepository.save(nuevoUsuario);
  }

  /**
   * Busca un usuario por su nombre de usuario o email para validación de login.
   */
  async findByIdentifier(identifier: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      select: ['id', 'username', 'email', 'contrasena', 'role', 'nombreCompleto', 'dni', 'phone', 'profilePicture'], // Añadimos campos necesarios
    });
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { email },
    });
  }

  async findOneById(id: number): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { id },
    });
  }

  async create(data: Partial<Usuario>): Promise<Usuario> {
    const nuevoUsuario = this.usuariosRepository.create(data);
    return this.usuariosRepository.save(nuevoUsuario);
  }

  /**
   * Actualiza los datos de un usuario.
   */
  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Convert empty string DNI to null to prevent UNIQUE constraint errors
    if (dto.dni === '') {
      dto.dni = null as any;
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

  async findAllClients(page: number = 1, limit: number = 20, search: string = ''): Promise<{ data: Usuario[], total: number }> {
    const query = this.usuariosRepository.createQueryBuilder('usuario')
      .where('usuario.role = :role', { role: UserRole.GUEST });

    if (search) {
      query.andWhere(
        '(usuario.nombreCompleto ILIKE :search OR usuario.email ILIKE :search OR usuario.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('usuario.id', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findClientsByBusiness(propertyId: number, page: number = 1, limit: number = 20, search: string = ''): Promise<{ data: Usuario[], total: number }> {
    const query = this.usuariosRepository.createQueryBuilder('usuario')
      .innerJoin('booking', 'booking', 'booking."usuarioId" = usuario.id')
      .where('booking."propertyId" = :propertyId', { propertyId })
      .andWhere('usuario.role = :role', { role: UserRole.GUEST });

    if (search) {
      query.andWhere(
        '(usuario.nombreCompleto ILIKE :search OR usuario.email ILIKE :search OR usuario.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Usar subconsulta o agrupar para evitar duplicados si un cliente tiene múltiples citas
    const [data, total] = await query
      .select('usuario') // asegurarnos de seleccionar solo la entidad usuario
      .distinct(true)    // evitar duplicados
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async remove(id: number): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new ConflictException('Usuario no encontrado');
    }
    await this.usuariosRepository.remove(usuario);
  }
}

