import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO para la creación de una empresa.
 * Incluye tanto los datos del perfil de la empresa como las credenciales
 * para su cuenta de usuario automática.
 */
export class CreatePropertyDto {
  @ApiProperty({ example: 'Peluquería Nova' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Alicante', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Calle Mayor 12', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '965123456', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'pnova' })
  @IsString()
  @MinLength(4)
  username: string;

  @ApiProperty({ example: 'contacto@pnova.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  contrasena: string;

  @ApiProperty({ example: 1, description: 'ID del jefe/administrador propietario' })
  @IsInt()
  usuarioId: number;
}
