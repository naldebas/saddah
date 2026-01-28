// src/modules/deals/dto/close-deal.dto.ts
import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDealDto {
  @ApiProperty({
    description: 'نتيجة الصفقة',
    enum: ['won', 'lost'],
  })
  @IsIn(['won', 'lost'])
  status: 'won' | 'lost';

  @ApiPropertyOptional({ description: 'سبب الخسارة (مطلوب عند الخسارة)' })
  @IsString()
  @IsOptional()
  lostReason?: string;
}
