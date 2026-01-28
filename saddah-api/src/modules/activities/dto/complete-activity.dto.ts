// src/modules/activities/dto/complete-activity.dto.ts
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CompleteActivityDto {
  @ApiPropertyOptional({ example: 'تم الاتفاق على موعد المعاينة', description: 'نتيجة النشاط' })
  @IsString()
  @IsOptional()
  outcome?: string;

  @ApiPropertyOptional({ example: 45, description: 'المدة الفعلية بالدقائق' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  duration?: number;
}
