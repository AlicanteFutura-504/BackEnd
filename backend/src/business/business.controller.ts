import { Controller, Post, Body } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async crearEmpresa(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.crearEmpresa(createBusinessDto);
  }
}
