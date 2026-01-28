// src/modules/deals/deals.module.ts
import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';

@Module({
  controllers: [DealsController, PipelinesController],
  providers: [DealsService, PipelinesService],
  exports: [DealsService, PipelinesService],
})
export class DealsModule {}
