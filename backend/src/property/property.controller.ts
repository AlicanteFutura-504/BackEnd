import { Controller, Post, Body, Get, Delete, Param, Patch, Req, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../usuarios/usuario.entity';

// Ensure uploads directory exists
const uploadDir = './uploads/properties';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

  @Public()
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('filterField') filterField?: string,
    @Query('filterValue') filterValue?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string
  ) {
    let user = req.user;
    if (!user && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        user = { userId: payload.sub, role: payload.role, username: payload.username };
      } catch (e) {}
    }
    user = user || { userId: 0, role: UserRole.GUEST, username: 'anonymous' };
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
      filterValue,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radius ? parseFloat(radius) : undefined
    );
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    let user = req.user;
    if (!user && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        user = { userId: payload.sub, role: payload.role, username: payload.username };
      } catch (e) {}
    }
    user = user || { userId: 0, role: UserRole.GUEST, username: 'anonymous' };
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

  @Public()
  @Get(':id/reviews')
  async getReviews(@Param('id') id: string) {
    return this.propertyService.findReviewsByProperty(+id);
  }

  @Post(':id/reviews')
  @Roles(UserRole.GUEST, UserRole.ADMIN)
  async createReview(
    @Param('id') id: string,
    @Body('score') score: number,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    const guestId = req.user.userId;
    return this.propertyService.createReview(+id, guestId, score, comment);
  }

  @Get(':id/can-review')
  @Roles(UserRole.GUEST, UserRole.HOST, UserRole.ADMIN)
  async canReview(@Param('id') id: string, @Req() req: any) {
    const guestId = req.user.userId;
    return this.propertyService.canReview(+id, guestId);
  }

  @Post('reviews/:reviewId/reply')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async replyToReview(
    @Param('reviewId') reviewId: string,
    @Body('hostReply') hostReply: string,
    @Req() req: any,
  ) {
    const hostId = req.user.userId;
    return this.propertyService.replyToReview(+reviewId, hostId, hostReply);
  }

  @Post(':id/images')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/properties',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    })
  }))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: any
  ) {
    const user = req.user;
    const imageUrl = `/uploads/properties/${file.filename}`;
    return this.propertyService.addImage(+id, imageUrl, user.userId, user.role);
  }

  @Delete(':id/images')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async deleteImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @Req() req: any
  ) {
    const user = req.user;
    return this.propertyService.removeImage(+id, imageUrl, user.userId, user.role);
  }
}
