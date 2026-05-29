import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail({}, { message: 'El formato del email no es válido' })
  email: string;

  @ApiProperty({ example: '600123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

}
