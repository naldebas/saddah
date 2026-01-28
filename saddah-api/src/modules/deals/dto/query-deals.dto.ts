// src/modules/deals/dto/query-deals.dto.ts
import { IsOptional, IsString, IsInt, IsUUID, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDealsDto {
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

  @ApiPropertyOptional({ description: 'البحث بالعنوان' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المالك' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب خط المبيعات' })
  @IsUUID()
  @IsOptional()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المرحلة' })
  @IsUUID()
  @IsOptional()
  stageId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب الشركة' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب الحالة',
    enum: ['open', 'won', 'lost'],
  })
  @IsIn(['open', 'won', 'lost'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['createdAt', 'title', 'value', 'expectedCloseDate', 'probability'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
