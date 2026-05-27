import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class ChatMessage {
  @ApiProperty({ description: 'Role of the message sender (user, assistant, system)' })
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: 'The prompt to send to the AI' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ description: 'History of previous messages in the conversation', required: false, type: [ChatMessage] })
  @IsArray()
  @IsOptional()
  history?: ChatMessage[];
}
