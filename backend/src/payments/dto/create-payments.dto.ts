import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PaymentStatus, PaymentType } from '../payments.entity';

/**
 * DTO (Data Transfer Object) para la creación de un pago.
 * Define la estructura que debe tener el JSON que recibe el backend al hacer un POST.
 * La librería 'class-validator' comprobará que cada campo cumpla la condición.
 */
export class CreatePaymentDto {
  /** Fecha del pago (Opcional). Formato YYYY-MM-DD para consistencia. */
  @ApiProperty({ example: '2026-04-15', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date?: string;

  /** Estado actual del pago. */
  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  /** Tipo de pago (tarjeta, efectivo, bizum, etc.). */
  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.CARD,
  })
  @IsEnum(PaymentType)
  type: PaymentType;

  /** Nombre del cliente que realiza el pago. */
  @ApiProperty({ example: 'María López' })
  @IsString()
  clientName: string;

  /** Nombre de la empresa o local en el que se ejecuta el pago. */
  @ApiProperty({ example: 'Peluquería Nova' })
  @IsString()
  businessName: string;

  /** Importe del pago. */
  @ApiProperty({ example: 28.5 })
  @IsNumber()
  @Min(0, { message: 'El importe no puede ser negativo' })
  amount: number;
}