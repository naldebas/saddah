// src/modules/conversations/dto/update-conversation.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from './create-conversation.dto';

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'معرف جهة الاتصال المرتبطة' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم المسؤول' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional({ type: Object, description: 'بيانات التأهيل' })
  @IsObject()
  @IsOptional()
  qualificationData?: Record<string, unknown>;
}

export class AssignConversationDto {
  @ApiPropertyOptional({ description: 'معرف المستخدم المسؤول' })
  @IsUUID()
  assignedToId: string;
}

export class CloseConversationDto {
  @ApiPropertyOptional({ description: 'سبب الإغلاق' })
  @IsString()
  @IsOptional()
  reason?: string;
}
