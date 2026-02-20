import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LeadSource {
  MANUAL = 'manual',
  WHATSAPP_BOT = 'whatsapp_bot',
  VOICE_BOT = 'voice_bot',
  WEB_FORM = 'web_form',
  REFERRAL = 'referral',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  GOOGLE_ADS = 'google_ads',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum PropertyType {
  VILLA = 'villa',
  APARTMENT = 'apartment',
  LAND = 'land',
  COMMERCIAL = 'commercial',
  OFFICE = 'office',
  WAREHOUSE = 'warehouse',
}

export class CreateLeadDto {
  @ApiProperty({ description: 'الاسم الأول', example: 'محمد' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'اسم العائلة', example: 'العتيبي' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  email?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف', example: '+966551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'رقم واتساب', example: '+966551234567' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({
    description: 'مصدر العميل المحتمل',
    enum: LeadSource,
    default: LeadSource.MANUAL,
  })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'معرف المصدر (مثل معرف المحادثة)' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({
    description: 'نوع العقار المطلوب',
    enum: PropertyType,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    description: 'الميزانية (ريال سعودي)',
    example: 1500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: 'الإطار الزمني للشراء',
    example: '3_months',
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({ description: 'الموقع المفضل', example: 'شمال الرياض' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'هل يحتاج تمويل؟' })
  @IsOptional()
  @IsBoolean()
  financingNeeded?: boolean;

  @ApiPropertyOptional({ description: 'معرف المالك (المندوب المسؤول)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'العلامات', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
