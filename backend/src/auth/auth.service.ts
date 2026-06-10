import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../property/property.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async login(loginDto: LoginDto) {
    const { identifier, contrasena } = loginDto;

    const user = await this.usuariosService.findByIdentifier(identifier);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(contrasena, user.contrasena);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Para usuarios con rol HOST, buscamos la propiedad (opcional, en esta fase)
    let propertyId: number | null = null;
    if (user.role === UserRole.HOST) {
      const property = await this.propertyRepository.findOne({
        where: { usuarioId: user.id },
      });
      propertyId = property?.id ?? null;
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      propertyId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        dni: user.dni,
        profilePicture: user.profilePicture,
        propertyId, // el frontend lo necesita para redirección y filtros
      },
    };
  }
}
