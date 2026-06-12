import { Controller, Get, Post, Body, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = req.user.userId;
    return this.messagesService.getConversations(userId);
  }

  @Get(':otherUserId')
  async getMessages(@Param('otherUserId') otherUserId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.messagesService.getMessagesBetween(userId, +otherUserId);
  }

  @Post(':receiverId')
  async sendMessage(
    @Param('receiverId') receiverId: string,
    @Body('content') content: string,
    @Body('bookingId') bookingId: number,
    @Req() req: any
  ) {
    const senderId = req.user.userId;
    return this.messagesService.sendMessage(senderId, +receiverId, content, bookingId);
  }

  @Patch(':otherUserId/read')
  async markAsRead(@Param('otherUserId') otherUserId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.messagesService.markAsRead(userId, +otherUserId);
  }
}
