import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async crearUsuario(
    @Body() body: { nombre: string; contrasena: string },
  ) {
    return this.usuariosService.crearUsuario(body.nombre, body.contrasena);
  }

  @Post('login')
  async login(
    @Body() body: { nombre: string; contrasena: string },
  ) {
    const usuario = await this.usuariosService.validarUsuario(body.nombre, body.contrasena);
    if (!usuario) {
      throw new UnauthorizedException('Nombre de usuario o contraseña incorrectos');
    }
    return { success: true, user: usuario };
  }
}
