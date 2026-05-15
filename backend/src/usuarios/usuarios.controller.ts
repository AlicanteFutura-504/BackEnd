import { Controller, Post, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UserRole } from './usuario.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { Public } from '../auth/public.decorator';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo Jefe/Administrador' })
  async register(@Body() dto: RegisterAdminDto) {
    return this.usuariosService.crearUsuario(
      dto.username,
      dto.email,
      dto.contrasena,
      UserRole.ADMIN,
      dto.nombreCompleto,
      dto.dni,
    );
  }
}
