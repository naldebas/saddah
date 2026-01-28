// src/modules/settings/dto/tenant-settings.dto.ts
import { IsString, IsOptional, IsEmail, IsUrl, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessHoursDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  end: string;

  @ApiProperty({ example: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] })
  @IsString({ each: true })
  workDays: string[];
}

export class BrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  favicon?: string;

  @ApiPropertyOptional({ example: '#0D9488' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;
}

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'شركة صدّاح العقارية' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'info@saddah.io' })
  @IsOptional()
  @IsEmail()
  companyEmail?: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiPropertyOptional({ example: 'الرياض، المملكة العربية السعودية' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({ example: 'https://saddah.io' })
  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @ApiPropertyOptional({ example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'ar' })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'dd/MM/yyyy' })
  @IsOptional()
  @IsString()
  dateFormat?: string;
}

export class TenantSettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  domain?: string;

  @ApiProperty()
  plan: string;

  @ApiProperty()
  settings: {
    companyName?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyAddress?: string;
    companyWebsite?: string;
    businessHours?: BusinessHoursDto;
    branding?: BrandingDto;
    timezone?: string;
    defaultLanguage?: string;
    currency?: string;
    dateFormat?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
