import { Controller, Post, Body, Get, Delete, Param, Patch, Req } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('business')
@ApiBearerAuth()
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async crearEmpresa(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.crearEmpresa(createBusinessDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const user = req.user;
    return this.businessService.findAll(user.userId, user.role, user.username);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.businessService.findOne(+id, user.userId, user.role, user.username);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto, @Req() req: any) {
    const user = req.user;
    return this.businessService.update(+id, updateBusinessDto, user.userId, user.role, user.username);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.businessService.remove(+id, user.userId, user.role, user.username);
  }
}
