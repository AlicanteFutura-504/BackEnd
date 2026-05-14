import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @ApiProperty({ example: 'jefe' })
  @IsString()
  @MinLength(4)
  username: string;

  @ApiProperty({ example: 'jefe@negocio.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  nombreCompleto: string;

  @ApiProperty({ example: '12345678Z' })
  @IsString()
  dni: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  contrasena: string;
}
