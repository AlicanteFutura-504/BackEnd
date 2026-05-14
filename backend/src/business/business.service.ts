import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './business.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  /**
   * Crea y guarda una nueva empresa en la base de datos.
   * @param nombre Nombre de la empresa.
   * @param contrasena Contraseña de la empresa.
   * @param usuarioId ID del usuario propietario.
   * @returns La empresa creada.
   */
  async crearEmpresa(nombre: string, contrasena: string, usuarioId: number): Promise<Business> {
    const nuevaEmpresa = this.businessRepository.create({
      nombre,
      contrasena,
      usuarioId,
    });
    return this.businessRepository.save(nuevaEmpresa);
  }
}
