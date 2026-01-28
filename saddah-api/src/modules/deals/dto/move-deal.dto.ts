// src/modules/deals/dto/move-deal.dto.ts
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveDealDto {
  @ApiProperty({ description: 'معرف المرحلة الجديدة' })
  @IsUUID()
  stageId: string;
}
