// src/modules/activities/dto/create-activity.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsDateString,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateActivityDto {
  @ApiProperty({
    example: 'call',
    description: 'نوع النشاط',
    enum: ['call', 'meeting', 'email', 'task', 'note', 'whatsapp', 'site_visit'],
  })
  @IsIn(['call', 'meeting', 'email', 'task', 'note', 'whatsapp', 'site_visit'])
  type: string;

  @ApiPropertyOptional({ example: 'مكالمة متابعة', description: 'عنوان النشاط' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: 'تم مناقشة تفاصيل العقار', description: 'وصف النشاط' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'معرف جهة الاتصال' })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsOptional()
  dealId?: string;

  @ApiPropertyOptional({ example: '2024-03-15T10:00:00Z', description: 'تاريخ الاستحقاق' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 30, description: 'المدة بالدقائق' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ type: Object, description: 'بيانات إضافية' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
