import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString } from 'class-validator';
import { AppointmentStatus } from '../appointment.entity';

/**
 * DTO (Data Transfer Object) para la creación de una reserva.
 * Define la estructura que debe tener el JSON que recibe el backend al hacer un POST.
 * La librería 'class-validator' comprobará que cada campo cumpla la condición.
 */
export class CreateAppointmentDto {
  /** Debe ser texto obligatoriamente. Ejemplo: '2026-04-20' */
  @ApiProperty({ example: '2026-04-20' })
  @IsString()
  date: string;

  /** Formato de texto para la hora. Ejemplo: '10:30' */
  @ApiProperty({ example: '10:30' })
  @IsString()
  time: string;

  /** Solo se permite uno de los textos válidos de AppointmentStatus. */
  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.PENDING,
  })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  /** El ID del cliente tiene que enviarse como número entero. */
  @ApiProperty({ example: 1 })
  @IsInt()
  customerId: number;

  /** El ID del negocio también debe ser un número entero. */
  @ApiProperty({ example: 1 })
  @IsInt()
  businessId: number;

  /** Un texto libre identificando al servicio. */
  @ApiProperty({ example: 'Corte de pelo' })
  @IsString()
  serviceName: string;
}