import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @IsOptional()
  @IsNumber()
  businessId?: number;

  @IsOptional()
  @IsString()
  serviceName?: string;
}
