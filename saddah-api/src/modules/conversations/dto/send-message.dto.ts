// src/modules/conversations/dto/send-message.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  TEMPLATE = 'template',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  CONTACT = 'contact',
}

export class SendMessageDto {
  @ApiProperty({ enum: MessageDirection, example: 'outbound' })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiProperty({ enum: MessageSender, example: 'user' })
  @IsEnum(MessageSender)
  sender: MessageSender;

  @ApiProperty({ enum: MessageType, default: 'text' })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ example: 'مرحباً، كيف يمكنني مساعدتك؟' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'مدة المقطع الصوتي/المرئي بالثواني' })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'معرف الرسالة من الخدمة الخارجية' })
  @IsString()
  @IsOptional()
  externalId?: string;
}

export class IncomingMessageDto extends SendMessageDto {
  @ApiProperty({ description: 'معرف قناة الرسالة (رقم الواتساب)' })
  @IsString()
  channelId: string;

  @ApiProperty({ description: 'نوع القناة' })
  @IsString()
  channel: string;
}
