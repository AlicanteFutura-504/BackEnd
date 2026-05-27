import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BookingsModule } from '../bookings/bookings.module';
import { CustomersModule } from '../customers/customers.module';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [BookingsModule, CustomersModule, BusinessModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
