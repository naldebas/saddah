// src/modules/deals/dto/update-pipeline.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePipelineDto } from './create-pipeline.dto';

export class UpdatePipelineDto extends PartialType(
  OmitType(CreatePipelineDto, ['stages'] as const),
) {}
