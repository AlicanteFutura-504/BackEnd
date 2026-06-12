import { Controller, Get, Patch, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) return [];
    return this.notificationsService.findAllForUser(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) return { success: false };
    await this.notificationsService.markAsRead(+id, userId);
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) return { success: false };
    await this.notificationsService.remove(+id, userId);
    return { success: true };
  }
}
