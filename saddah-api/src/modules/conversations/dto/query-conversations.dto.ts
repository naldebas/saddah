// src/modules/conversations/dto/query-conversations.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationChannel, ConversationStatus } from './create-conversation.dto';

export class QueryConversationsDto {
  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: ConversationChannel })
  @IsEnum(ConversationChannel)
  @IsOptional()
  channel?: ConversationChannel;

  @ApiPropertyOptional({ description: 'معرف المستخدم المسؤول' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'معرف جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'المحادثات غير المعينة فقط' })
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  unassignedOnly?: boolean;

  @ApiPropertyOptional({ default: 'lastMessageAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class QueryMessagesDto {
  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'جلب الرسائل قبل هذا المعرف' })
  @IsUUID()
  @IsOptional()
  before?: string;

  @ApiPropertyOptional({ description: 'جلب الرسائل بعد هذا المعرف' })
  @IsUUID()
  @IsOptional()
  after?: string;
}
