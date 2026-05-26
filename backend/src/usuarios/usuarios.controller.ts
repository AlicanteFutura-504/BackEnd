import { Controller, Post, Body, Patch, Param, ParseIntPipe, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname, join } from 'path';
import { UsuariosService } from './usuarios.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UserRole } from './usuario.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { Public } from '../auth/public.decorator';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo Jefe/Administrador' })
  async register(@Body() dto: RegisterAdminDto) {
    return this.usuariosService.crearUsuario(
      dto.username,
      dto.email,
      dto.contrasena,
      UserRole.ADMIN,
      dto.nombreCompleto,
      dto.dni,
    );
  }

  @Patch('me/update')
  @ApiOperation({ summary: 'Actualizar mis propios datos' })
  async updateMe(@Req() req: any, @Body() dto: UpdateUsuarioDto) {
    // El ID viene del token decodificado en JwtStrategy
    const userId = req.user.userId;
    return this.usuariosService.update(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Subir foto de perfil' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
      const ext = extname(file.originalname).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      
      if (!allowedMimes.includes(file.mimetype.toLowerCase()) && !allowedExts.includes(ext)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB limit
    }
  }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo no encontrado');
    
    // El ID viene del token decodificado en JwtStrategy
    const userId = req.user.userId;
    // Guardamos la URL relativa (el main.ts está sirviendo '/uploads')
    const filePath = `/uploads/${file.filename}`;
    
    // Actualizamos la base de datos
    await this.usuariosService.update(userId, { profilePicture: filePath });
    
    return { profilePicture: filePath };
  }
}
