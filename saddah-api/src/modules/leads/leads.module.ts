import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadRecommendationsService } from './lead-recommendations.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadRecommendationsService],
  exports: [LeadsService],
})
export class LeadsModule {}
