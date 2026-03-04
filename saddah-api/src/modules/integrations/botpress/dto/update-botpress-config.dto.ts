// src/modules/integrations/botpress/dto/update-botpress-config.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateBotpressConfigDto } from './create-botpress-config.dto';

export class UpdateBotpressConfigDto extends PartialType(CreateBotpressConfigDto) {}
