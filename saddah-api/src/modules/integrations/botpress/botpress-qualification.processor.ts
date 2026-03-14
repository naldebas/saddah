// src/modules/integrations/botpress/botpress-qualification.processor.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressSyncService } from './botpress-sync.service';
import { QualificationData, BotpressInternalEvents } from './interfaces';
import { LeadAssignmentService } from '@/modules/leads/lead-assignment.service';
import { ProductSuggestionService } from '@/modules/products/product-suggestion.service';

export interface QualificationProcessResult {
  success: boolean;
  leadId?: string;
  dealId?: string;
  contactId?: string;
  isNewLead?: boolean;
  isNewDeal?: boolean;
  isNewContact?: boolean;
  suggestionsCount?: number;
  assignedTo?: string;
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
    @Inject(forwardRef(() => LeadAssignmentService))
    private readonly leadAssignmentService: LeadAssignmentService,
    @Inject(forwardRef(() => ProductSuggestionService))
    private readonly productSuggestionService: ProductSuggestionService,
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

      let conversation;

      if (convMapping) {
        // Get the existing Saddah conversation
        conversation = await this.prisma.conversation.findUnique({
          where: { id: convMapping.conversationId },
        });

        if (conversation) {
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
        }
      }

      // If no conversation exists, create one for the bot-originated lead
      if (!conversation) {
        this.logger.log(
          `No existing conversation mapping for botpress conv ${botpressConversationId}, creating new conversation`,
        );

        // Get first admin as fallback assignee
        const admin = await this.prisma.user.findFirst({
          where: { tenantId, role: 'admin' },
        });

        conversation = await this.prisma.conversation.create({
          data: {
            tenantId,
            channel: 'whatsapp',
            channelId: data.phone || botpressConversationId,
            status: 'qualified',
            assignedToId: admin?.id,
            qualificationData: {
              ...(data as unknown as Record<string, any>),
              botpressConversationId,
              source: 'botpress_bot',
            },
          },
        });

        // Create sync mapping for future reference
        await this.prisma.botpressConversation.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            botpressConvId: botpressConversationId,
            botpressState: 'qualified',
            lastSyncedAt: new Date(),
          },
        });
      }

      let lead = null;
      let deal = null;
      let contact = null;
      let isNewLead = false;
      let isNewDeal = false;
      let isNewContact = false;
      let suggestionsCount = 0;

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

        // Auto-create Contact from lead data
        contact = await this.createContact(tenantId, lead, data);
        isNewContact = true;

        // Link lead to contact
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { contactId: contact.id },
        });

        // Link conversation to contact
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { contactId: contact.id },
        });

        // Auto-assign conversation to lead owner
        if (lead.ownerId) {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              assignedToId: lead.ownerId,
              status: 'active',
            },
          });

          // Create notification for assigned sales rep
          await this.createLeadNotification(tenantId, lead);

          // Log activity for the lead creation
          await this.logLeadCreationActivity(tenantId, lead, conversation.id, data);
        }

        // Generate product suggestions based on lead criteria
        suggestionsCount = await this.generateProductSuggestions(tenantId, lead.id, data);

        this.eventEmitter.emit(BotpressInternalEvents.LEAD_CREATED, {
          tenantId,
          leadId: lead.id,
          contactId: contact.id,
          conversationId: conversation.id,
          assignedTo: lead.ownerId,
          qualificationData: data,
          suggestionsCount,
        });
      } else if (lead) {
        // Update existing lead with new data
        lead = await this.updateLead(lead.id, data);

        // Create Contact if one doesn't exist yet for this lead
        if (!lead.contactId) {
          contact = await this.createContact(tenantId, lead, data);
          isNewContact = true;

          // Link lead to contact
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { contactId: contact.id },
          });

          // Link conversation to contact
          if (conversation) {
            await this.prisma.conversation.update({
              where: { id: conversation.id },
              data: { contactId: contact.id },
            });
          }

          this.logger.log(
            `Created contact ${contact.id} for existing lead ${lead.id}`,
          );
        }

        // Regenerate product suggestions for updated lead
        suggestionsCount = await this.generateProductSuggestions(tenantId, lead.id, data);
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
          `contact=${contact?.id || 'none'} (new=${isNewContact}), ` +
          `deal=${deal?.id || 'none'} (new=${isNewDeal}), ` +
          `suggestions=${suggestionsCount}, ` +
          `score=${data.seriousnessScore}`,
      );

      return {
        success: true,
        leadId: lead?.id,
        dealId: deal?.id,
        contactId: contact?.id,
        isNewLead,
        isNewDeal,
        isNewContact,
        suggestionsCount,
        assignedTo: lead?.ownerId || undefined,
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
   * Create a new lead from qualification data with auto-assignment
   */
  private async createLead(
    tenantId: string,
    conversationId: string,
    data: QualificationData,
  ) {
    // Parse name into first/last name
    // Handle name as string OR object { first, last }
    let nameStr = 'عميل واتساب';
    if (data.name) {
      if (typeof data.name === 'string') {
        nameStr = data.name;
      } else if (typeof data.name === 'object') {
        const nameObj = data.name as any;
        nameStr = [nameObj.first, nameObj.last].filter(Boolean).join(' ');
      }
    }
    const nameParts = nameStr.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Get next assignee using round-robin
    const assignedOwnerId = await this.leadAssignmentService.getNextAssignee(tenantId);

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        ownerId: assignedOwnerId,
        firstName,
        lastName,
        phone: data.phone,
        whatsapp: data.phone,
        email: data.email,
        source: 'whatsapp_bot',
        sourceId: conversationId,
        status: 'qualified',
        score: data.seriousnessScore,
        scoreGrade: this.calculateGrade(data.seriousnessScore),
        propertyType: data.propertyType,
        budget: data.budget?.max,
        location: data.location?.district || data.location?.city || undefined,
        timeline: data.timeline,
        financingNeeded: data.financingNeeded,
        projectId: data.projectId || undefined,
        notes: this.buildLeadNotes(data),
        customFields: {
          botpressQualification: true,
          qualificationDate: data.collectedAt,
          region: data.location?.region,
          city: data.location?.city,
          district: data.location?.district,
          budgetMin: data.budget?.min,
          budgetCurrency: data.budget?.currency,
          projectName: data.projectName,
        },
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Created lead ${lead.id} from bot, assigned to ${lead.owner?.firstName} ${lead.owner?.lastName}`,
    );

    return lead;
  }

  /**
   * Calculate score grade
   */
  private calculateGrade(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  /**
   * Create a Contact from lead data
   */
  private async createContact(
    tenantId: string,
    lead: any,
    data: QualificationData,
  ) {
    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        ownerId: lead.ownerId,
        leadId: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName || '',
        phone: lead.phone,
        whatsapp: lead.whatsapp || lead.phone,
        email: lead.email,
        source: 'whatsapp_bot',
        tags: ['من البوت', 'مؤهل'],
        customFields: {
          qualificationScore: data.seriousnessScore,
          propertyType: data.propertyType,
          budget: data.budget?.max,
          budgetCurrency: data.budget?.currency || 'SAR',
          location: data.location?.city,
          district: data.location?.district,
          timeline: data.timeline,
          financingNeeded: data.financingNeeded,
        },
      },
    });

    this.logger.log(`Created contact ${contact.id} from lead ${lead.id}`);

    return contact;
  }

  /**
   * Generate product suggestions for a lead based on qualification data
   */
  private async generateProductSuggestions(
    tenantId: string,
    leadId: string,
    data: QualificationData,
  ): Promise<number> {
    try {
      // Build search criteria from qualification data
      const searchCriteria = {
        propertyType: data.propertyType,
        budgetMax: data.budget?.max,
        city: data.location?.city,
        district: data.location?.district,
        limit: 10,
      };

      // Find matching products
      const matches = await this.productSuggestionService.findMatchingProducts(
        tenantId,
        searchCriteria,
      );

      if (matches.length === 0) {
        this.logger.log(`No product matches found for lead ${leadId}`);
        return 0;
      }

      // Create suggestions
      await this.productSuggestionService.createSuggestions(leadId, matches);

      this.logger.log(
        `Created ${matches.length} product suggestions for lead ${leadId}`,
      );

      return matches.length;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate product suggestions for lead ${leadId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Create notification for sales rep about new lead
   */
  private async createLeadNotification(tenantId: string, lead: any) {
    if (!lead.ownerId) return;

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: lead.ownerId,
        type: 'new_lead',
        title: 'عميل محتمل جديد',
        message: `تم تعيين عميل محتمل جديد لك: ${lead.firstName} ${lead.lastName || ''} - ${lead.phone}`,
        data: {
          leadId: lead.id,
          source: 'whatsapp_bot',
          score: lead.score,
          scoreGrade: lead.scoreGrade,
        },
      },
    });

    this.logger.log(`Created notification for user ${lead.ownerId} about lead ${lead.id}`);
  }

  /**
   * Log activity for lead creation from bot
   */
  private async logLeadCreationActivity(
    tenantId: string,
    lead: any,
    conversationId: string,
    data: QualificationData,
  ) {
    if (!lead.ownerId) return;

    await this.prisma.activity.create({
      data: {
        tenantId,
        createdById: lead.ownerId,
        type: 'note',
        subject: 'عميل محتمل من بوت الواتساب',
        description: `تم إنشاء عميل محتمل جديد من محادثة الواتساب.\n\n` +
          `درجة الجدية: ${data.seriousnessScore}%\n` +
          `نوع العقار: ${data.propertyType || 'غير محدد'}\n` +
          `الميزانية: ${data.budget?.max?.toLocaleString() || 'غير محدد'} ${data.budget?.currency || 'ر.س'}\n` +
          `الموقع: ${data.location?.city || 'غير محدد'}\n` +
          `الجدول الزمني: ${data.timeline || 'غير محدد'}`,
        isCompleted: true,
        completedAt: new Date(),
        metadata: {
          leadId: lead.id,
          conversationId,
          source: 'whatsapp_bot',
          qualificationScore: data.seriousnessScore,
          propertyType: data.propertyType,
          budget: data.budget?.max,
          location: data.location?.city,
        },
      },
    });

    this.logger.log(`Created activity for lead ${lead.id} creation`);
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
    if (data.location?.district) {
      updates.location = data.location.district;
    } else if (data.location?.city) {
      updates.location = data.location.city;
    }
    if (data.timeline) updates.timeline = data.timeline;
    if (data.financingNeeded !== undefined) updates.financingNeeded = data.financingNeeded;
    if (data.projectId) updates.projectId = data.projectId;

    // Update custom fields with latest qualification data
    const existingLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { customFields: true },
    });

    updates.customFields = {
      ...((existingLead?.customFields as any) || {}),
      qualificationDate: new Date().toISOString(),
      botpressQualification: true,
      district: data.location?.district,
      city: data.location?.city,
      budgetCurrency: data.budget?.currency,
      projectName: data.projectName,
    };

    // Update notes with latest qualification
    updates.notes = this.buildLeadNotes(data);

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
        title: `صفقة - ${lead.firstName}${lead.lastName ? ' ' + lead.lastName : ''}`,
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
