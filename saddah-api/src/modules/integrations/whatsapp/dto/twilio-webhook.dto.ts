// src/modules/integrations/whatsapp/dto/twilio-webhook.dto.ts
import { IsString, IsOptional, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Twilio WhatsApp Webhook Payload DTO
 * @see https://www.twilio.com/docs/messaging/guides/webhook-request
 */
export class TwilioWebhookDto {
  @ApiProperty({ description: 'Unique message identifier' })
  @IsString()
  MessageSid: string;

  @ApiProperty({ description: 'Account SID' })
  @IsString()
  AccountSid: string;

  @ApiProperty({ description: 'Sender phone number (whatsapp:+1234567890)' })
  @IsString()
  From: string;

  @ApiProperty({ description: 'Recipient phone number (whatsapp:+1234567890)' })
  @IsString()
  To: string;

  @ApiPropertyOptional({ description: 'Message body/text content' })
  @IsString()
  @IsOptional()
  Body?: string;

  @ApiPropertyOptional({ description: 'Number of media attachments' })
  @IsNumberString()
  @IsOptional()
  NumMedia?: string;

  @ApiPropertyOptional({ description: 'First media URL' })
  @IsString()
  @IsOptional()
  MediaUrl0?: string;

  @ApiPropertyOptional({ description: 'First media content type' })
  @IsString()
  @IsOptional()
  MediaContentType0?: string;

  @ApiPropertyOptional({ description: 'Second media URL' })
  @IsString()
  @IsOptional()
  MediaUrl1?: string;

  @ApiPropertyOptional({ description: 'Second media content type' })
  @IsString()
  @IsOptional()
  MediaContentType1?: string;

  @ApiPropertyOptional({ description: 'Latitude (for location messages)' })
  @IsString()
  @IsOptional()
  Latitude?: string;

  @ApiPropertyOptional({ description: 'Longitude (for location messages)' })
  @IsString()
  @IsOptional()
  Longitude?: string;

  @ApiPropertyOptional({ description: 'Location address' })
  @IsString()
  @IsOptional()
  Address?: string;

  @ApiPropertyOptional({ description: 'Location label' })
  @IsString()
  @IsOptional()
  Label?: string;

  @ApiPropertyOptional({ description: 'Profile name of sender' })
  @IsString()
  @IsOptional()
  ProfileName?: string;

  @ApiPropertyOptional({ description: 'WhatsApp message ID' })
  @IsString()
  @IsOptional()
  WaId?: string;

  @ApiPropertyOptional({ description: 'Forwarded count' })
  @IsNumberString()
  @IsOptional()
  Forwarded?: string;

  @ApiPropertyOptional({ description: 'Frequently forwarded flag' })
  @IsString()
  @IsOptional()
  FrequentlyForwarded?: string;

  @ApiPropertyOptional({ description: 'Button text (for button replies)' })
  @IsString()
  @IsOptional()
  ButtonText?: string;

  @ApiPropertyOptional({ description: 'Button payload' })
  @IsString()
  @IsOptional()
  ButtonPayload?: string;

  @ApiPropertyOptional({ description: 'List item ID (for list replies)' })
  @IsString()
  @IsOptional()
  ListId?: string;

  @ApiPropertyOptional({ description: 'List item title' })
  @IsString()
  @IsOptional()
  ListTitle?: string;
}

/**
 * Twilio Status Callback DTO
 */
export class TwilioStatusCallbackDto {
  @ApiProperty({ description: 'Message SID' })
  @IsString()
  MessageSid: string;

  @ApiProperty({ description: 'Message status' })
  @IsString()
  MessageStatus: string;

  @ApiPropertyOptional({ description: 'Recipient phone number' })
  @IsString()
  @IsOptional()
  To?: string;

  @ApiPropertyOptional({ description: 'Sender phone number' })
  @IsString()
  @IsOptional()
  From?: string;

  @ApiPropertyOptional({ description: 'Error code (if failed)' })
  @IsString()
  @IsOptional()
  ErrorCode?: string;

  @ApiPropertyOptional({ description: 'Error message (if failed)' })
  @IsString()
  @IsOptional()
  ErrorMessage?: string;

  @ApiPropertyOptional({ description: 'Channel (e.g., whatsapp)' })
  @IsString()
  @IsOptional()
  ChannelPrefix?: string;
}
