import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customer.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PaymentsModule } from '../payments/payments.module';
import { Business } from '../business/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Business]),
    PaymentsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
