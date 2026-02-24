// src/modules/integrations/whatsapp/dto/meta-webhook.dto.ts
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Meta WhatsApp Cloud API Webhook Payload DTOs
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

// Text message content
export class MetaTextContent {
  @IsString()
  body: string;
}

// Media content (image, audio, video, document, sticker)
export class MetaMediaContent {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  mime_type?: string;

  @IsString()
  @IsOptional()
  sha256?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  filename?: string;
}

// Location content
export class MetaLocationContent {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

// Contact phone
export class MetaContactPhone {
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  wa_id?: string;
}

// Contact name
export class MetaContactName {
  @IsString()
  formatted_name: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  middle_name?: string;
}

// Contact content
export class MetaContactContent {
  @ValidateNested()
  @Type(() => MetaContactName)
  name: MetaContactName;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaContactPhone)
  @IsOptional()
  phones?: MetaContactPhone[];
}

// Reaction content
export class MetaReactionContent {
  @IsString()
  message_id: string;

  @IsString()
  emoji: string;
}

// Interactive button reply
export class MetaButtonReply {
  @IsString()
  id: string;

  @IsString()
  title: string;
}

// Interactive list reply
export class MetaListReply {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// Interactive content
export class MetaInteractiveContent {
  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => MetaButtonReply)
  @IsOptional()
  button_reply?: MetaButtonReply;

  @ValidateNested()
  @Type(() => MetaListReply)
  @IsOptional()
  list_reply?: MetaListReply;
}

// Message context (for replies)
export class MetaMessageContext {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  referred_product?: any;
}

// Individual message in webhook
export class MetaWebhookMessage {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => MetaTextContent)
  @IsOptional()
  text?: MetaTextContent;

  @ValidateNested()
  @Type(() => MetaMediaContent)
  @IsOptional()
  image?: MetaMediaContent;

  @ValidateNested()
  @Type(() => MetaMediaContent)
  @IsOptional()
  audio?: MetaMediaContent;

  @ValidateNested()
  @Type(() => MetaMediaContent)
  @IsOptional()
  video?: MetaMediaContent;

  @ValidateNested()
  @Type(() => MetaMediaContent)
  @IsOptional()
  document?: MetaMediaContent;

  @ValidateNested()
  @Type(() => MetaMediaContent)
  @IsOptional()
  sticker?: MetaMediaContent;

  @ValidateNested()
  @Type(() => MetaLocationContent)
  @IsOptional()
  location?: MetaLocationContent;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaContactContent)
  @IsOptional()
  contacts?: MetaContactContent[];

  @ValidateNested()
  @Type(() => MetaReactionContent)
  @IsOptional()
  reaction?: MetaReactionContent;

  @ValidateNested()
  @Type(() => MetaInteractiveContent)
  @IsOptional()
  interactive?: MetaInteractiveContent;

  @ValidateNested()
  @Type(() => MetaMessageContext)
  @IsOptional()
  context?: MetaMessageContext;
}

// Contact profile in webhook
export class MetaWebhookContact {
  @IsString()
  wa_id: string;

  @ApiPropertyOptional()
  profile?: {
    name?: string;
  };
}

// Status error
export class MetaStatusError {
  @IsNumber()
  code: number;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  error_data?: any;
}

// Status in webhook
export class MetaWebhookStatus {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsString()
  timestamp: string;

  @IsString()
  recipient_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaStatusError)
  @IsOptional()
  errors?: MetaStatusError[];

  @ApiPropertyOptional()
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin?: {
      type: string;
    };
  };

  @ApiPropertyOptional()
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}

// Value object in webhook
export class MetaWebhookValue {
  @IsString()
  messaging_product: string;

  @ApiProperty()
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaWebhookContact)
  @IsOptional()
  contacts?: MetaWebhookContact[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaWebhookMessage)
  @IsOptional()
  messages?: MetaWebhookMessage[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaWebhookStatus)
  @IsOptional()
  statuses?: MetaWebhookStatus[];
}

// Change object
export class MetaWebhookChange {
  @IsString()
  field: string;

  @ValidateNested()
  @Type(() => MetaWebhookValue)
  value: MetaWebhookValue;
}

// Entry object
export class MetaWebhookEntry {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaWebhookChange)
  changes: MetaWebhookChange[];
}

// Root webhook payload
export class MetaWebhookDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaWebhookEntry)
  entry: MetaWebhookEntry[];
}
