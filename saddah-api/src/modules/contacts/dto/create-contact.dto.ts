// src/modules/contacts/dto/create-contact.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'محمد', description: 'الاسم الأول' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'العتيبي', description: 'الاسم الأخير' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ example: 'mohammed@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+966551234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+966551234567' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'مدير المبيعات' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'whatsapp_bot' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'معرف المالك' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'معرف الشركة' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ type: [String], example: ['VIP', 'عقارات'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
