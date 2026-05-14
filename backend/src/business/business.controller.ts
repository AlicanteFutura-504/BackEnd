import { Controller, Post, Body } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async crearEmpresa(
    @Body() body: { nombre: string; contrasena: string; usuarioId: number },
  ) {
    return this.businessService.crearEmpresa(body.nombre, body.contrasena, body.usuarioId || 0);
  }
}
