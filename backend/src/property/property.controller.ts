import { Controller, Post, Body, Get, Delete, Param, Patch, Req, Query } from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../usuarios/usuario.entity';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async crearEmpresa(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertyService.crearEmpresa(createPropertyDto);
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
    return this.propertyService.findAll(
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
    return this.propertyService.findOne(+id, user.userId, user.role, user.username);
  }

  @Patch(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto, @Req() req: any) {
    const user = req.user;
    return this.propertyService.update(+id, updatePropertyDto, user.userId, user.role, user.username);
  }

  @Delete(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.propertyService.remove(+id, user.userId, user.role, user.username);
  }
}
