import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadRecommendationsService } from './lead-recommendations.service';
import { LeadAssignmentService } from './lead-assignment.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadRecommendationsService, LeadAssignmentService],
  exports: [LeadsService, LeadAssignmentService],
})
export class LeadsModule {}
