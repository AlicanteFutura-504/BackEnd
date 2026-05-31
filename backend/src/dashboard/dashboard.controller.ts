import { Controller, Get, Param, Req, ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user);
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
