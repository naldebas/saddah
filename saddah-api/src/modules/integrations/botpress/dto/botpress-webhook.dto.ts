// src/modules/integrations/botpress/dto/botpress-webhook.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsDateString,
  IsIn,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotpressEventType } from '../interfaces/botpress-events.interface';

export class BotpressWebhookPayloadDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direction?: 'incoming' | 'outgoing';

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  // Qualification fields - name can be a string or object { first, last } from Botpress
  @ApiPropertyOptional()
  @IsOptional()
  name?: string | Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  propertyType?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  location?: {
    city?: string;
    district?: string;
    region?: string;
  };

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timeline?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  financingNeeded?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  seriousnessScore?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  collectedAt?: string;

  // Project fields (from dynamic bot flow)
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectName?: string;

  // Handoff fields
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  // State change fields
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  previousState?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentState?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  stateData?: Record<string, any>;
}

export class BotpressWebhookDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  type: BotpressEventType;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Botpress Bot ID' })
  @IsString()
  @IsNotEmpty()
  botId: string;

  @ApiProperty({ description: 'Botpress Conversation ID' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Botpress User ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Event payload' })
  @ValidateNested()
  @Type(() => BotpressWebhookPayloadDto)
  payload: BotpressWebhookPayloadDto;
}

// Response DTOs
export class BotpressConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  botId: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  webhookUrl: string;

  @ApiProperty()
  callbackUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  autoCreateLead: boolean;

  @ApiProperty()
  autoConvertDeal: boolean;

  @ApiProperty()
  qualificationThreshold: number;

  @ApiPropertyOptional()
  defaultPipelineId?: string;

  @ApiPropertyOptional()
  lastTestedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ description: 'Masked credentials for display' })
  maskedCredentials: Record<string, string>;
}

export class BotpressTestResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  botId?: string;

  @ApiPropertyOptional()
  botName?: string;

  @ApiPropertyOptional()
  workspaceId?: string;

  @ApiPropertyOptional()
  workspaceName?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  testedAt: Date;
}

export class BotpressConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  botpressConvId: string;

  @ApiPropertyOptional()
  botpressState: string | null;

  @ApiProperty()
  qualificationData: Record<string, any>;

  @ApiProperty()
  qualificationScore: number;

  @ApiProperty()
  lastSyncedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
