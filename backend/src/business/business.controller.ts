import { Controller, Post, Body, Get, Delete, Param, Patch } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.businessService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto) {
    return this.businessService.update(+id, updateBusinessDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.businessService.remove(+id);
  }
}
