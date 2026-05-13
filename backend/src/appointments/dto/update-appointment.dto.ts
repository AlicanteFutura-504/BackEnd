import { PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

/**
 * DTO para la actualización parcial de una reserva (PATCH).
 * Extiende {@link CreateAppointmentDto} haciendo todos sus campos opcionales.
 * Al usar `PartialType` de `@nestjs/swagger`, los decoradores `@ApiProperty`
 * se heredan automáticamente con `required: false`.
 */
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}
