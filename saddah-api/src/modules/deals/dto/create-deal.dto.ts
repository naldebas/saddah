// src/modules/deals/dto/create-deal.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @ApiProperty({ example: 'فيلا حي النرجس', description: 'عنوان الصفقة' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 1500000, description: 'قيمة الصفقة' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value: number;

  @ApiPropertyOptional({ example: 'SAR', default: 'SAR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'معرف خط المبيعات' })
  @IsUUID()
  pipelineId: string;

  @ApiProperty({ description: 'معرف المرحلة' })
  @IsUUID()
  stageId: string;

  @ApiPropertyOptional({ description: 'معرف جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'معرف الشركة' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'معرف المالك' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ example: 50, description: 'نسبة الاحتمالية (0-100)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  probability?: number;

  @ApiPropertyOptional({ example: '2024-03-15', description: 'تاريخ الإغلاق المتوقع' })
  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ type: [String], example: ['عاجل', 'VIP'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
