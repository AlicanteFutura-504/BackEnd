import { Controller, Get, Param, Req, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    try {
      return await this.dashboardService.getSummary(req.user);
    } catch (e: any) {
      throw new HttpException({ message: e.message, stack: e.stack }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('business/:id')
  async getBusinessSummary(@Param('id') id: string, @Req() req: any) {
    try {
      return await this.dashboardService.getBusinessSummary(+id, req.user);
    } catch (e) {
      console.error("Error in getBusinessSummary:", e);
      throw new ForbiddenException('No tienes acceso a este negocio');
    }
  }
}
