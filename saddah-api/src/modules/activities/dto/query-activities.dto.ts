// src/modules/activities/dto/query-activities.dto.ts
import { IsOptional, IsString, IsInt, IsUUID, IsIn, Min, IsBoolean, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryActivitiesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'البحث بالعنوان أو الوصف' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب النوع',
    enum: ['call', 'meeting', 'email', 'task', 'note', 'whatsapp', 'site_visit'],
  })
  @IsIn(['call', 'meeting', 'email', 'task', 'note', 'whatsapp', 'site_visit'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب الصفقة' })
  @IsUUID()
  @IsOptional()
  dealId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المنشئ' })
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب حالة الإكمال' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'تاريخ الاستحقاق من' })
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'تاريخ الاستحقاق إلى' })
  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['createdAt', 'dueDate', 'type', 'subject'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
