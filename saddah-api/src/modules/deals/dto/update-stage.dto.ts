// src/modules/deals/dto/update-stage.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePipelineStageDto } from './create-pipeline.dto';

export class UpdateStageDto extends PartialType(CreatePipelineStageDto) {}
