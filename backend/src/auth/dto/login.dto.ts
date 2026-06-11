import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin o admin@ejemplo.com',
    description: 'Nombre de usuario o Correo electrónico',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  contrasena: string;
}
