// src/modules/companies/dto/create-company.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsObject,
  MinLength,
  IsUrl,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'شركة الرياض للعقارات', description: 'اسم الشركة' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'عقارات', description: 'القطاع/الصناعة' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ example: 'https://riyadh-realestate.sa' })
  @IsUrl({}, { message: 'يجب أن يكون الموقع الإلكتروني رابطاً صالحاً' })
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: '+966112345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@riyadh-realestate.sa' })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'شارع الملك فهد، حي العليا' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'الرياض' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'SA', default: 'SA' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'حجم الشركة',
    enum: ['small', 'medium', 'large', 'enterprise'],
  })
  @IsIn(['small', 'medium', 'large', 'enterprise'])
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ type: [String], example: ['VIP', 'شريك'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
