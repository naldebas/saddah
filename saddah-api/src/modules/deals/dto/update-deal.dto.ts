// src/modules/deals/dto/update-deal.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ['pipelineId'] as const),
) {}
