// src/modules/deals/dto/create-pipeline.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  Max,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePipelineStageDto {
  @ApiProperty({ example: 'التأهيل', description: 'اسم المرحلة' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'ترتيب المرحلة (يتم حسابه تلقائياً إذا لم يُحدد)' })
  @ValidateIf((o) => o.order !== undefined && o.order !== null)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 20, description: 'نسبة الاحتمالية (0-100)' })
  @ValidateIf((o) => o.probability !== undefined && o.probability !== null)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ example: '#10B981', description: 'لون المرحلة' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CreatePipelineDto {
  @ApiProperty({ example: 'مبيعات العقارات', description: 'اسم خط المبيعات' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ default: false, description: 'خط المبيعات الافتراضي' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    type: [CreatePipelineStageDto],
    description: 'مراحل خط المبيعات',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePipelineStageDto)
  @IsOptional()
  stages?: CreatePipelineStageDto[];
}
