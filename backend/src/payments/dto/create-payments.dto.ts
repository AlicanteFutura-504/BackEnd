import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString } from 'class-validator';
import { PaymentStatus, PaymentType } from '../payments.entity';

/**
 * DTO (Data Transfer Object) para la creación de un pago.
 * Define la estructura que debe tener el JSON que recibe el backend al hacer un POST.
 * La librería 'class-validator' comprobará que cada campo cumpla la condición.
 */
export class CreatePaymentDto {
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
  amount: number;
}