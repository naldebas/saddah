// src/modules/integrations/botpress/botpress-qualification.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressSyncService } from './botpress-sync.service';
import { QualificationData, BotpressInternalEvents } from './interfaces';

export interface QualificationProcessResult {
  success: boolean;
  leadId?: string;
  dealId?: string;
  isNewLead?: boolean;
  isNewDeal?: boolean;
  error?: string;
}

@Injectable()
export class BotpressQualificationProcessor {
  private readonly logger = new Logger(BotpressQualificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: BotpressConfigService,
    private readonly syncService: BotpressSyncService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process qualification complete event from Botpress
   */
  async processQualificationComplete(
    tenantId: string,
    botpressConversationId: string,
    data: QualificationData,
  ): Promise<QualificationProcessResult> {
    try {
      // Get config
      const config = await this.configService.findByTenant(tenantId);
      if (!config) {
        return { success: false, error: 'Botpress config not found' };
      }

      // Find the Saddah conversation mapping
      const convMapping = await this.syncService.getByBotpressConvId(
        tenantId,
        botpressConversationId,
      );

      if (!convMapping) {
        return { success: false, error: 'Conversation mapping not found' };
      }

      // Get the Saddah conversation
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: convMapping.conversationId },
      });

      if (!conversation) {
        return { success: false, error: 'Saddah conversation not found' };
      }

      // Update the mapping with qualification data
      await this.syncService.updateQualificationData(
        convMapping.id,
        data as unknown as Record<string, any>,
        data.seriousnessScore,
        'qualified',
      );

      // Update conversation qualification data
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          qualificationData: data as unknown as any,
          status: 'qualified',
        },
      });

      let lead = null;
      let deal = null;
      let isNewLead = false;
      let isNewDeal = false;

      // Check if lead already exists by phone
      if (data.phone) {
        lead = await this.prisma.lead.findFirst({
          where: {
            tenantId,
            phone: data.phone,
          },
        });
      }

      // Auto-create lead if enabled and not exists
      if (!lead && config.autoCreateLead) {
        lead = await this.createLead(tenantId, conversation.id, data);
        isNewLead = true;

        this.eventEmitter.emit(BotpressInternalEvents.LEAD_CREATED, {
          tenantId,
          leadId: lead.id,
          conversationId: conversation.id,
          qualificationData: data,
        });
      } else if (lead) {
        // Update existing lead with new data
        lead = await this.updateLead(lead.id, data);
      }

      // Auto-convert to deal if enabled and score meets threshold
      if (
        config.autoConvertDeal &&
        lead &&
        data.seriousnessScore >= config.qualificationThreshold
      ) {
        // Check if deal already exists for this lead
        const existingDeal = await this.prisma.deal.findFirst({
          where: {
            tenantId,
            OR: [
              { customFields: { path: ['leadId'], equals: lead.id } },
              { customFields: { path: ['sourceLeadId'], equals: lead.id } },
            ],
          },
        });

        if (!existingDeal) {
          deal = await this.createDeal(tenantId, lead, config.defaultPipelineId, data);
          isNewDeal = true;

          // Update lead as converted
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              convertedAt: new Date(),
              convertedToDealId: deal.id,
              status: 'converted',
            },
          });

          // Link conversation to deal (using custom fields since no direct relation)
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              qualificationData: {
                ...(conversation.qualificationData as any || {}),
                dealId: deal.id,
                leadId: lead.id,
              },
            },
          });

          this.eventEmitter.emit(BotpressInternalEvents.DEAL_CREATED, {
            tenantId,
            dealId: deal.id,
            leadId: lead.id,
            conversationId: conversation.id,
            qualificationData: data,
          });
        }
      }

      this.logger.log(
        `Processed qualification for conversation ${conversation.id}: ` +
          `lead=${lead?.id || 'none'} (new=${isNewLead}), ` +
          `deal=${deal?.id || 'none'} (new=${isNewDeal}), ` +
          `score=${data.seriousnessScore}`,
      );

      return {
        success: true,
        leadId: lead?.id,
        dealId: deal?.id,
        isNewLead,
        isNewDeal,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to process qualification: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new lead from qualification data
   */
  private async createLead(
    tenantId: string,
    conversationId: string,
    data: QualificationData,
  ) {
    // Parse name into first/last name
    const nameParts = (data.name || 'عميل واتساب').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    return this.prisma.lead.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: data.phone,
        whatsapp: data.phone,
        email: data.email,
        source: 'whatsapp_bot',
        sourceId: conversationId,
        status: 'qualified',
        score: data.seriousnessScore,
        propertyType: data.propertyType,
        budget: data.budget?.max,
        location: data.location?.city,
        timeline: data.timeline,
        financingNeeded: data.financingNeeded,
        notes: this.buildLeadNotes(data),
        customFields: {
          botpressQualification: true,
          qualificationDate: data.collectedAt,
          region: data.location?.region,
          district: data.location?.district,
          budgetMin: data.budget?.min,
          budgetCurrency: data.budget?.currency,
        },
      },
    });
  }

  /**
   * Update existing lead with new qualification data
   */
  private async updateLead(leadId: string, data: QualificationData) {
    const updates: any = {
      score: data.seriousnessScore,
      status: 'qualified',
    };

    // Only update fields that have values
    if (data.propertyType) updates.propertyType = data.propertyType;
    if (data.budget?.max) updates.budget = data.budget.max;
    if (data.location?.city) updates.location = data.location.city;
    if (data.timeline) updates.timeline = data.timeline;
    if (data.financingNeeded !== undefined) updates.financingNeeded = data.financingNeeded;

    return this.prisma.lead.update({
      where: { id: leadId },
      data: updates,
    });
  }

  /**
   * Create a deal from a qualified lead
   */
  private async createDeal(
    tenantId: string,
    lead: any,
    defaultPipelineId: string | null,
    data: QualificationData,
  ) {
    // Get pipeline and first stage
    let pipeline;
    if (defaultPipelineId) {
      pipeline = await this.prisma.pipeline.findUnique({
        where: { id: defaultPipelineId },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
    }

    if (!pipeline) {
      // Get default pipeline
      pipeline = await this.prisma.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
    }

    if (!pipeline) {
      // Create a basic pipeline if none exists
      pipeline = await this.prisma.pipeline.create({
        data: {
          tenantId,
          name: 'الافتراضية',
          isDefault: true,
          stages: {
            create: [
              { name: 'جديد', order: 0, probability: 10, color: '#3B82F6' },
              { name: 'تواصل', order: 1, probability: 25, color: '#F59E0B' },
              { name: 'تفاوض', order: 2, probability: 50, color: '#8B5CF6' },
              { name: 'مغلق - ربح', order: 3, probability: 100, color: '#10B981' },
              { name: 'مغلق - خسارة', order: 4, probability: 0, color: '#EF4444' },
            ],
          },
        },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
    }

    const firstStage = pipeline.stages[0];

    // Get first admin user as owner (fallback)
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: 'admin' },
    });

    if (!owner) {
      throw new Error('No admin user found to assign as deal owner');
    }

    // Calculate deal value from budget
    const dealValue = data.budget?.max || 0;

    return this.prisma.deal.create({
      data: {
        tenantId,
        ownerId: lead.ownerId || owner.id,
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        title: `صفقة - ${data.name || lead.firstName}`,
        value: dealValue,
        currency: data.budget?.currency || 'SAR',
        status: 'open',
        customFields: {
          sourceLeadId: lead.id,
          botpressQualified: true,
          qualificationScore: data.seriousnessScore,
          propertyType: data.propertyType,
          timeline: data.timeline,
          financingNeeded: data.financingNeeded,
        },
      },
    });
  }

  /**
   * Build notes string from qualification data
   */
  private buildLeadNotes(data: QualificationData): string {
    const parts = [];

    parts.push('تم التأهيل عبر بوت الواتساب (Botpress)');
    parts.push(`درجة الجدية: ${data.seriousnessScore}%`);

    if (data.propertyType) {
      parts.push(`نوع العقار: ${data.propertyType}`);
    }

    if (data.location) {
      const loc = [];
      if (data.location.city) loc.push(data.location.city);
      if (data.location.district) loc.push(data.location.district);
      if (data.location.region) loc.push(data.location.region);
      if (loc.length) parts.push(`الموقع: ${loc.join('، ')}`);
    }

    if (data.budget) {
      const budget = [];
      if (data.budget.min) budget.push(`من ${data.budget.min.toLocaleString()}`);
      if (data.budget.max) budget.push(`إلى ${data.budget.max.toLocaleString()}`);
      if (budget.length) {
        parts.push(`الميزانية: ${budget.join(' ')} ${data.budget.currency || 'ر.س'}`);
      }
    }

    if (data.timeline) {
      parts.push(`الجدول الزمني: ${data.timeline}`);
    }

    if (data.financingNeeded !== undefined) {
      parts.push(`تمويل عقاري: ${data.financingNeeded ? 'نعم' : 'لا'}`);
    }

    if (data.notes) {
      parts.push(`ملاحظات: ${data.notes}`);
    }

    return parts.join('\n');
  }

  /**
   * Handle handoff request from Botpress
   */
  async processHandoffRequest(
    tenantId: string,
    botpressConversationId: string,
    reason: string,
    priority: string = 'normal',
    context?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const convMapping = await this.syncService.getByBotpressConvId(
        tenantId,
        botpressConversationId,
      );

      if (!convMapping) {
        return { success: false, error: 'Conversation mapping not found' };
      }

      // Update Saddah conversation status to pending (awaiting human)
      await this.prisma.conversation.update({
        where: { id: convMapping.conversationId },
        data: {
          status: 'pending',
          qualificationData: {
            ...(await this.prisma.conversation
              .findUnique({ where: { id: convMapping.conversationId } })
              .then((c) => (c?.qualificationData as any) || {})),
            handoffReason: reason,
            handoffPriority: priority,
            handoffAt: new Date().toISOString(),
            handoffContext: context,
          },
        },
      });

      // Update Botpress conversation state
      await this.syncService.updateState(convMapping.id, 'human_handoff');

      this.eventEmitter.emit(BotpressInternalEvents.HANDOFF_TRIGGERED, {
        tenantId,
        conversationId: convMapping.conversationId,
        botpressConversationId,
        reason,
        priority,
      });

      this.logger.log(
        `Handoff triggered for conversation ${convMapping.conversationId}: ${reason}`,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to process handoff: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
