// src/modules/conversations/dto/create-conversation.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConversationChannel {
  WHATSAPP = 'whatsapp',
  VOICE = 'voice',
  WEB_CHAT = 'web_chat',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum ConversationStatus {
  BOT = 'bot',
  PENDING = 'pending',
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationChannel, example: 'whatsapp' })
  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @ApiProperty({ example: '+966551234567', description: 'معرف القناة الخارجية (رقم الواتساب مثلاً)' })
  @IsString()
  channelId: string;

  @ApiPropertyOptional({ description: 'معرف جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم المسؤول' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ConversationStatus, default: 'bot' })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional({ type: Object, description: 'بيانات التأهيل' })
  @IsObject()
  @IsOptional()
  qualificationData?: Record<string, unknown>;
}
