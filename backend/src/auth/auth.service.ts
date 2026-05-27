import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../business/business.entity';
import { UserRole } from '../usuarios/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
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

    // Para usuarios con rol BUSINESS, buscamos el negocio asociado y lo metemos en el token
    let businessId: number | null = null;
    if (user.role === UserRole.BUSINESS) {
      const business = await this.businessRepository.findOne({
        where: { businessUserId: user.id },
      });
      businessId = business?.id ?? null;
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      businessId,
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
        businessId, // el frontend lo necesita para redirección y filtros
      },
    };
  }
}
