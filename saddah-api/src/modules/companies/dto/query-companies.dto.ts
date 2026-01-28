// src/modules/companies/dto/query-companies.dto.ts
import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCompaniesDto {
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

  @ApiPropertyOptional({ description: 'البحث بالاسم أو البريد أو الهاتف' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب القطاع' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المدينة' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب الحجم',
    enum: ['small', 'medium', 'large', 'enterprise'],
  })
  @IsIn(['small', 'medium', 'large', 'enterprise'])
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['createdAt', 'name', 'city', 'industry'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
