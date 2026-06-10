import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payments.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Property } from '../property/property.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Property])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
