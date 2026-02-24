// src/modules/settings/dto/whatsapp-config.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WhatsAppProvider {
  TWILIO = 'twilio',
  META = 'meta',
}

/**
 * Twilio credentials
 */
export class TwilioCredentialsDto {
  @ApiProperty({ description: 'Twilio Account SID' })
  @IsString()
  accountSid: string;

  @ApiProperty({ description: 'Twilio Auth Token' })
  @IsString()
  authToken: string;
}

/**
 * Meta/Facebook credentials
 */
export class MetaCredentialsDto {
  @ApiProperty({ description: 'Meta WhatsApp API Token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Meta Phone Number ID' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'Meta Business Account ID' })
  @IsString()
  businessAccountId: string;

  @ApiPropertyOptional({ description: 'Meta App Secret (for webhook verification)' })
  @IsString()
  @IsOptional()
  appSecret?: string;
}

/**
 * DTO for creating/updating WhatsApp configuration
 */
export class UpdateWhatsAppConfigDto {
  @ApiProperty({
    description: 'WhatsApp provider',
    enum: WhatsAppProvider,
    example: WhatsAppProvider.TWILIO,
  })
  @IsEnum(WhatsAppProvider)
  provider: WhatsAppProvider;

  @ApiProperty({
    description: 'WhatsApp phone number in international format',
    example: '+966501234567',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +966501234567)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Twilio credentials (required if provider is twilio)' })
  @ValidateNested()
  @Type(() => TwilioCredentialsDto)
  @IsOptional()
  twilioCredentials?: TwilioCredentialsDto;

  @ApiPropertyOptional({ description: 'Meta credentials (required if provider is meta)' })
  @ValidateNested()
  @Type(() => MetaCredentialsDto)
  @IsOptional()
  metaCredentials?: MetaCredentialsDto;

  @ApiPropertyOptional({ description: 'Enable WhatsApp integration', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Response DTO for WhatsApp configuration (excludes sensitive data)
 */
export class WhatsAppConfigResponseDto {
  @ApiProperty({ description: 'Configuration ID' })
  id: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({
    description: 'WhatsApp provider',
    enum: WhatsAppProvider,
  })
  provider: WhatsAppProvider;

  @ApiProperty({ description: 'WhatsApp phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Whether the configuration is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether credentials have been verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Webhook URL for this tenant' })
  webhookUrl: string;

  @ApiPropertyOptional({ description: 'Last successful test timestamp' })
  lastTestedAt?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Masked credentials indicator',
    example: { accountSid: 'AC***...***1234' },
  })
  maskedCredentials?: Record<string, string>;
}

/**
 * Test connection result DTO
 */
export class TestConnectionResultDto {
  @ApiProperty({ description: 'Whether the connection test was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if test failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Provider-specific test results' })
  details?: Record<string, any>;

  @ApiProperty({ description: 'Timestamp of the test' })
  testedAt: Date;
}
