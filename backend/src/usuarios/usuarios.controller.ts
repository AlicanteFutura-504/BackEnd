import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UserRole } from './usuario.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/public.decorator';

@ApiTags('usuarios')
@ApiBearerAuth()
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, dto);
  }

  @Get('guests')
  @ApiOperation({ summary: 'Obtener todos los clientes/huéspedes' })
  async getClients(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usuariosService.findAllClients(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || '',
    );
  }

  @Get('guests/property/:propertyId')
  @ApiOperation({ summary: 'Obtener los huéspedes de una propiedad' })
  async getClientsByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usuariosService.findClientsByProperty(
      propertyId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || '',
    );
  }

  @Get('by-email/:email')
  @ApiOperation({ summary: 'Obtener usuario por email' })
  async getByEmail(@Param('email') email: string) {
    return this.usuariosService.findByEmail(email);
  }

  @Post('guests')
  @ApiOperation({ summary: 'Crear un nuevo huésped' })
  async createClient(@Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.crearUsuario(
      dto.username || `g_${Date.now()}`,
      dto.email!,
      dto.contrasena || '1234',
      UserRole.GUEST,
      dto.nombreCompleto,
      dto.dni,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }

  @Get(':id/trust-score')
  @ApiOperation({ summary: 'Obtener el trust score de un huésped' })
  async getTrustScore(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.getGuestTrustScore(id);
  }
}
