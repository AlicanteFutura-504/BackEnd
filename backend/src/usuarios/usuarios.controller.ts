import { Controller, Post, Body, Patch, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
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

  @Patch('me/update')
  @ApiOperation({ summary: 'Actualizar mis propios datos' })
  async updateMe(@Req() req: any, @Body() dto: UpdateUsuarioDto) {
    // El ID viene del token decodificado en JwtStrategy
    const userId = req.user.userId;
    return this.usuariosService.update(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }
}
