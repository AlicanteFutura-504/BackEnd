import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('ai-chatbot')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Enviar un mensaje al Chatbot de la IA' })
  async chat(@Req() req: any, @Body() dto: ChatRequestDto) {
    // req.user viene del JwtStrategy (protegido por APP_GUARD global)
    return this.aiService.getChatResponse(dto, req.user);
  }
}
