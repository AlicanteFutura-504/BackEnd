import { Controller, Post, Body, Get, Delete, Param, Patch, Req, Query } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../usuarios/usuario.entity';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async crearEmpresa(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.crearEmpresa(createBusinessDto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('filterField') filterField?: string,
    @Query('filterValue') filterValue?: string
  ) {
    const user = req.user;
    return this.businessService.findAll(
      user.userId, 
      user.role, 
      user.username,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search || '',
      sortBy,
      (sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'),
      filterField,
      filterValue
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.businessService.findOne(+id, user.userId, user.role, user.username);
  }

  @Patch(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto, @Req() req: any) {
    const user = req.user;
    return this.businessService.update(+id, updateBusinessDto, user.userId, user.role, user.username);
  }

  @Delete(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.businessService.remove(+id, user.userId, user.role, user.username);
  }
}
