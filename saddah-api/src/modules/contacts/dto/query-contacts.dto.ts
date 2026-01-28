// src/modules/contacts/dto/query-contacts.dto.ts
import { IsOptional, IsString, IsInt, IsUUID, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryContactsDto {
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

  @ApiPropertyOptional({ description: 'تصفية حسب المالك' })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب الشركة' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المصدر' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['createdAt', 'firstName', 'lastName', 'email'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
