import {
  Controller,
  Get,
  Param,
  Req,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req: any, @Query('range') range?: string) {
    try {
      return await this.dashboardService.getSummary(req.user, range);
    } catch (e: any) {
      throw new HttpException(
        { message: e.message, stack: e.stack },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('property/:id')
  async getPropertySummary(
    @Param('id') id: string,
    @Req() req: any,
    @Query('range') range?: string,
  ) {
    try {
      if (!id || id === 'undefined' || id === 'null' || isNaN(+id)) {
        throw new HttpException(
          'ID de propiedad inválido',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.dashboardService.getPropertySummary(
        +id,
        req.user,
        range,
      );
    } catch (e: any) {
      console.error('Error in getPropertySummary:', e);
      throw new ForbiddenException(
        e.message || 'No tienes acceso a esta propiedad',
      );
    }
  }
}
