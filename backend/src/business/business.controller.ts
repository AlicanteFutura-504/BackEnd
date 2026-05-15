import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async crearEmpresa(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.crearEmpresa(createBusinessDto);
  }

  @Get()
  async findAll() {
    return this.businessService.findAll();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.businessService.remove(+id);
  }
}
