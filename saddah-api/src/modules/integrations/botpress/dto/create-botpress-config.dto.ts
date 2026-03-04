// src/modules/integrations/botpress/dto/create-botpress-config.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BotpressCredentialsDto {
  @ApiProperty({ description: 'Botpress Personal Access Token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Webhook secret for signature verification' })
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}

export class CreateBotpressConfigDto {
  @ApiProperty({ description: 'Botpress Bot ID' })
  @IsString()
  @IsNotEmpty()
  botId: string;

  @ApiProperty({ description: 'Botpress Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Botpress credentials (token and webhook secret)' })
  @ValidateNested()
  @Type(() => BotpressCredentialsDto)
  credentials: BotpressCredentialsDto;

  @ApiPropertyOptional({ description: 'Botpress webhook URL (Botpress endpoint)' })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Auto-create leads from qualification', default: true })
  @IsBoolean()
  @IsOptional()
  autoCreateLead?: boolean;

  @ApiPropertyOptional({ description: 'Auto-convert qualified leads to deals', default: true })
  @IsBoolean()
  @IsOptional()
  autoConvertDeal?: boolean;

  @ApiPropertyOptional({ description: 'Qualification score threshold for deal conversion', default: 60 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  qualificationThreshold?: number;

  @ApiPropertyOptional({ description: 'Default pipeline ID for auto-created deals' })
  @IsUUID()
  @IsOptional()
  defaultPipelineId?: string;
}
