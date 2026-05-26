import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'juan.perez', description: 'Nombre de usuario' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'juan@ejemplo.com', description: 'Correo electrónico' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez García', description: 'Nombre completo' })
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: '12345678X', description: 'DNI o Identificación' })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiPropertyOptional({ example: 'nuevaContrasena123', description: 'Nueva contraseña' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  contrasena?: string;

  @ApiPropertyOptional({ example: '/uploads/avatar.png', description: 'Ruta de foto de perfil' })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}
