import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO para la actualización de una empresa.
 * Solo permite actualizar los datos básicos del perfil.
 */
export class UpdateBusinessDto {
  @ApiProperty({ example: 'Peluquería Nova', required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ example: 'Calle Mayor 12, Alicante', required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ example: '965123456', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;
}
