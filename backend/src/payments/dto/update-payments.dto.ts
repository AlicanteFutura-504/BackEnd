import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payments.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
