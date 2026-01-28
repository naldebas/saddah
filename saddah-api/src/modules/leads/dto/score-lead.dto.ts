import { IsInt, IsString, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScoreLeadDto {
  @ApiProperty({ description: 'نقاط التصنيف (0-100)', example: 75 })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({
    description: 'تصنيف العميل',
    example: 'A',
    enum: ['A', 'B', 'C', 'D'],
  })
  @IsString()
  grade: string;

  @ApiProperty({
    description: 'عوامل التصنيف',
    example: { budget: 30, timeline: 20, engagement: 25 },
  })
  @IsObject()
  factors: Record<string, number>;
}
