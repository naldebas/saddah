// src/modules/integrations/whatsapp/whatsapp-bot.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../../prisma/prisma.service';
import { LlmService } from '../../ai/llm.service';
import { StateMachineService } from '../../ai/state-machine/state-machine.service';
import { ContextService } from '../../ai/context/context.service';
import { SaudiDialectService } from '../../ai/dialect/saudi-dialect.service';
import {
  QualificationState,
  QualificationData,
  createInitialQualificationData,
  isFullyQualified,
} from '../../ai/state-machine/states';

import { WhatsAppSenderService } from './whatsapp-sender.service';
import { WhatsAppTransformerService, TransformedMessage } from './whatsapp-transformer.service';
import { WhatsAppWebhookController, WhatsAppWebhookHandler } from './whatsapp-webhook.controller';
import { WhatsAppContactSyncService } from './whatsapp-contact-sync.service';
import { IncomingMessage, StatusUpdate } from './interfaces/whatsapp-adapter.interface';
import {
  ConversationChannel,
  ConversationStatus,
} from '../../conversations/dto/create-conversation.dto';
import { MessageDirection, MessageSender } from '../../conversations/dto/send-message.dto';

/**
 * Bot response result
 */
export interface BotResponse {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  responseText?: string;
  state?: QualificationState;
  handoffTriggered?: boolean;
  error?: string;
}

/**
 * Events emitted by the bot service
 */
export const WhatsAppBotEvents = {
  CONVERSATION_STARTED: 'whatsapp.bot.conversation_started',
  MESSAGE_PROCESSED: 'whatsapp.bot.message_processed',
  RESPONSE_SENT: 'whatsapp.bot.response_sent',
  QUALIFICATION_COMPLETE: 'whatsapp.bot.qualification_complete',
  HANDOFF_TRIGGERED: 'whatsapp.bot.handoff_triggered',
  LEAD_CREATED: 'whatsapp.bot.lead_created',
  ERROR: 'whatsapp.bot.error',
} as const;

@Injectable()
export class WhatsAppBotService implements OnModuleInit, WhatsAppWebhookHandler {
  private readonly logger = new Logger(WhatsAppBotService.name);
  private readonly botEnabled: boolean;
  private readonly botGreeting: string;
  private readonly handoffKeywords: string[];
  private readonly maxBotRetries: number;
  private readonly defaultTenantId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly llmService: LlmService,
    private readonly stateMachine: StateMachineService,
    private readonly contextService: ContextService,
    private readonly dialectService: SaudiDialectService,
    private readonly senderService: WhatsAppSenderService,
    private readonly transformer: WhatsAppTransformerService,
    private readonly webhookController: WhatsAppWebhookController,
    private readonly contactSyncService: WhatsAppContactSyncService,
  ) {
    this.botEnabled = this.configService.get<boolean>('whatsapp.botEnabled', true);
    this.botGreeting = this.configService.get<string>(
      'whatsapp.botGreeting',
      'مرحباً! أنا مساعدك الآلي من صداح. كيف يمكنني مساعدتك اليوم؟',
    );
    this.handoffKeywords = this.configService.get<string[]>('whatsapp.humanHandoffKeywords', [
      'مساعدة',
      'موظف',
      'بشري',
      'help',
      'agent',
      'human',
    ]);
    this.maxBotRetries = this.configService.get<number>('whatsapp.maxBotRetries', 3);
    // In production, this would be determined by the phone number or webhook config
    this.defaultTenantId = this.configService.get<string>('DEFAULT_TENANT_ID', '');
  }

  onModuleInit() {
    // Register as webhook handler
    this.webhookController.registerHandler(this);
    this.logger.log(`WhatsApp Bot Service initialized. Bot enabled: ${this.botEnabled}`);
  }

  /**
   * Handle incoming WhatsApp message
   */
  async onMessage(incomingMessage: IncomingMessage): Promise<void> {
    if (!this.botEnabled) {
      this.logger.debug('Bot is disabled, skipping message processing');
      return;
    }

    try {
      // Transform the incoming message
      const message = this.transformer.transformIncomingMessage(incomingMessage);

      // Process the message
      const result = await this.processMessage(message);

      if (result.success) {
        this.logger.log(
          `Bot processed message from ${message.channelId}: state=${result.state}`,
        );
      } else {
        this.logger.error(`Bot failed to process message: ${result.error}`);
      }
    } catch (error: any) {
      this.logger.error(`Error in onMessage: ${error.message}`, error.stack);
      this.eventEmitter.emit(WhatsAppBotEvents.ERROR, {
        error: error.message,
        from: incomingMessage.from,
      });
    }
  }

  /**
   * Handle status updates
   */
  async onStatusUpdate(status: StatusUpdate): Promise<void> {
    this.logger.debug(`Status update received: ${status.messageId} -> ${status.status}`);
    // Status updates are handled by the sender service
  }

  /**
   * Process a transformed message
   */
  async processMessage(message: TransformedMessage): Promise<BotResponse> {
    const tenantId = this.defaultTenantId;

    try {
      // 1. Find or create conversation
      const conversation = await this.findOrCreateConversation(tenantId, message);

      // 2. Save the incoming message
      await this.saveMessage(conversation.id, message);

      // 3. Check if bot should handle (not in human mode)
      if (conversation.status !== 'bot') {
        this.logger.debug(`Conversation ${conversation.id} not in bot mode, skipping`);
        return {
          success: true,
          conversationId: conversation.id,
          handoffTriggered: false,
        };
      }

      // 4. Load qualification data
      let qualificationData = (conversation.qualificationData as unknown as QualificationData) ||
        createInitialQualificationData();

      // 5. Check for handoff keywords
      if (this.shouldHandoff(message.content)) {
        return this.triggerHandoff(conversation.id, qualificationData, 'User requested human agent');
      }

      // 6. Get conversation history
      const history = await this.getConversationHistory(conversation.id);

      // 7. Process through state machine
      const stateMachineResponse = this.stateMachine.processMessage(
        message.content,
        qualificationData,
        history.length,
      );

      qualificationData = stateMachineResponse.updatedData;

      // 8. Check for handoff from state machine
      if (stateMachineResponse.responseType === 'handoff') {
        return this.triggerHandoff(
          conversation.id,
          qualificationData,
          qualificationData.handoffReason || 'State machine triggered handoff',
        );
      }

      // 9. Generate bot response
      const responseText = await this.generateResponse(
        history,
        message.content,
        qualificationData,
      );

      // 10. Send response
      const sendResult = await this.sendBotResponse(
        conversation.id,
        message.channelId,
        responseText,
      );

      // 11. Update conversation with new qualification data
      await this.updateConversation(conversation.id, qualificationData);

      // 12. Check if fully qualified
      if (isFullyQualified(qualificationData) && !qualificationData.qualifiedAt) {
        qualificationData.qualifiedAt = new Date().toISOString();
        await this.handleQualificationComplete(conversation.id, qualificationData, message.channelId);
      }

      this.eventEmitter.emit(WhatsAppBotEvents.MESSAGE_PROCESSED, {
        conversationId: conversation.id,
        state: qualificationData.state,
        qualificationScore: qualificationData.qualificationScore,
      });

      return {
        success: true,
        conversationId: conversation.id,
        messageId: sendResult.messageId,
        responseText,
        state: qualificationData.state,
        handoffTriggered: false,
      };
    } catch (error: any) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find or create a conversation for the phone number
   */
  private async findOrCreateConversation(
    tenantId: string,
    message: TransformedMessage,
  ) {
    // Find existing open conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        channelId: message.channelId,
        channel: ConversationChannel.WHATSAPP,
        status: { notIn: ['closed', 'resolved'] },
      },
    });

    if (!conversation) {
      // Sync contact/lead before creating conversation
      const syncResult = await this.contactSyncService.findOrCreateFromWhatsApp(
        tenantId,
        message.channelId,
        message.senderName, // Use sender name if available from WhatsApp
      );

      // Create new conversation with contact link if found
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          channel: ConversationChannel.WHATSAPP,
          channelId: message.channelId,
          status: ConversationStatus.BOT,
          qualificationData: createInitialQualificationData() as any,
          // Link to contact if we found one
          contactId: syncResult.type === 'contact' ? syncResult.contact?.id : undefined,
        },
      });

      this.logger.log(
        `Created new conversation ${conversation.id} for ${message.channelId} ` +
        `(${syncResult.type}: ${syncResult.contact?.id || syncResult.lead?.id || 'new'})`,
      );

      // Send greeting for new conversation
      await this.sendBotResponse(conversation.id, message.channelId, this.botGreeting);

      this.eventEmitter.emit(WhatsAppBotEvents.CONVERSATION_STARTED, {
        conversationId: conversation.id,
        channelId: message.channelId,
        contactSyncResult: syncResult.type,
        contactId: syncResult.contact?.id,
        leadId: syncResult.lead?.id,
      });
    } else if (!conversation.contactId) {
      // Existing conversation without contact link - try to link now
      const syncResult = await this.contactSyncService.findOrCreateFromWhatsApp(
        tenantId,
        message.channelId,
        undefined,
        conversation.id,
      );

      if (syncResult.type === 'contact' && syncResult.contact) {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { contactId: syncResult.contact.id },
        });
      }
    }

    return conversation;
  }

  /**
   * Save incoming message to database
   */
  private async saveMessage(conversationId: string, message: TransformedMessage) {
    return this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl,
        externalId: message.externalId,
        status: 'received',
      },
    });
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(conversationId: string, limit = 20) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order
    return messages.reverse().map((msg) => ({
      id: msg.id,
      direction: msg.direction as 'inbound' | 'outbound',
      sender: msg.sender,
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
    }));
  }

  /**
   * Generate bot response using LLM
   */
  private async generateResponse(
    history: any[],
    userMessage: string,
    qualificationData: QualificationData,
  ): Promise<string> {
    // If LLM is not available, use fallback responses
    if (!this.llmService.isAvailable()) {
      return this.getFallbackResponse(qualificationData.state);
    }

    try {
      // Build context for LLM
      const storedMessages = history.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        sender: msg.sender,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt,
        timestamp: msg.createdAt,
      }));

      const context = this.contextService.buildMinimalContext(storedMessages, qualificationData);

      // Add user's latest message
      context.push({
        role: 'user',
        content: userMessage,
      });

      // Generate response
      const response = await this.llmService.chat(context);

      return response.content;
    } catch (error: any) {
      this.logger.error(`LLM error: ${error.message}`);
      return this.getFallbackResponse(qualificationData.state);
    }
  }

  /**
   * Get fallback response when LLM is not available
   */
  private getFallbackResponse(state: QualificationState): string {
    const responses: Record<QualificationState, string> = {
      [QualificationState.INITIAL]: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
      [QualificationState.GREETING]: 'أهلاً وسهلاً! هل تبحث عن عقار معين؟',
      [QualificationState.ASK_NAME]: 'ممكن أعرف اسمك الكريم؟',
      [QualificationState.ASK_PROPERTY_TYPE]: 'ما نوع العقار اللي تبحث عنه؟ فيلا، شقة، أرض؟',
      [QualificationState.ASK_LOCATION]: 'في أي منطقة أو حي تفضل؟',
      [QualificationState.ASK_BUDGET]: 'كم ميزانيتك التقريبية؟',
      [QualificationState.ASK_TIMELINE]: 'متى تخطط للشراء تقريباً؟',
      [QualificationState.ASK_FINANCING]: 'هل تحتاج تمويل عقاري؟',
      [QualificationState.QUALIFIED]: 'ممتاز! جمعت كل المعلومات. هل تحب أحجز لك موعد مع أحد مستشارينا؟',
      [QualificationState.OFFER_APPOINTMENT]: 'متى يناسبك موعد للمقابلة؟',
      [QualificationState.SCHEDULE_APPOINTMENT]: 'تم تأكيد الموعد. سنتواصل معك قريباً.',
      [QualificationState.HUMAN_HANDOFF]: 'سأحولك الآن لأحد موظفينا. شكراً لصبرك.',
      [QualificationState.CLOSED]: 'شكراً لتواصلك معنا. نتطلع لخدمتك مجدداً.',
    };

    return responses[state] || 'كيف يمكنني مساعدتك؟';
  }

  /**
   * Send bot response
   */
  private async sendBotResponse(
    conversationId: string,
    to: string,
    text: string,
  ) {
    // Save outgoing message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.OUTBOUND,
        sender: MessageSender.BOT,
        type: 'text',
        content: text,
        status: 'queued',
      },
    });

    // Queue for sending
    const result = await this.senderService.queueTextMessage(
      message.id,
      this.defaultTenantId,
      conversationId,
      to,
      text,
    );

    // Update message with queue info
    if (result.queuedJobId) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'sending' },
      });
    }

    this.eventEmitter.emit(WhatsAppBotEvents.RESPONSE_SENT, {
      conversationId,
      messageId: message.id,
      to,
    });

    return {
      messageId: message.id,
      ...result,
    };
  }

  /**
   * Update conversation with qualification data
   */
  private async updateConversation(
    conversationId: string,
    qualificationData: QualificationData,
  ) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        qualificationData: qualificationData as any,
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Check if message contains handoff keywords
   */
  private shouldHandoff(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.handoffKeywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Trigger handoff to human agent
   */
  private async triggerHandoff(
    conversationId: string,
    qualificationData: QualificationData,
    reason: string,
  ): Promise<BotResponse> {
    // Update qualification data
    qualificationData.state = QualificationState.HUMAN_HANDOFF;
    qualificationData.handoffReason = reason;
    qualificationData.lastUpdated = new Date().toISOString();

    // Update conversation status
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.PENDING,
        qualificationData: qualificationData as any,
      },
    });

    // Get conversation to send handoff message
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation) {
      // Send handoff message
      await this.sendBotResponse(
        conversationId,
        conversation.channelId,
        'سأحولك الآن لأحد موظفينا. يرجى الانتظار قليلاً.',
      );
    }

    this.eventEmitter.emit(WhatsAppBotEvents.HANDOFF_TRIGGERED, {
      conversationId,
      reason,
      qualificationData,
    });

    this.logger.log(`Handoff triggered for conversation ${conversationId}: ${reason}`);

    return {
      success: true,
      conversationId,
      state: QualificationState.HUMAN_HANDOFF,
      handoffTriggered: true,
    };
  }

  /**
   * Handle qualification complete
   */
  private async handleQualificationComplete(
    conversationId: string,
    qualificationData: QualificationData,
    phoneNumber: string,
  ) {
    this.logger.log(`Qualification complete for conversation ${conversationId}`);

    // Create lead from qualification data
    try {
      const lead = await this.createLeadFromQualification(
        conversationId,
        qualificationData,
        phoneNumber,
      );

      this.eventEmitter.emit(WhatsAppBotEvents.QUALIFICATION_COMPLETE, {
        conversationId,
        leadId: lead?.id,
        qualificationData,
      });

      if (lead) {
        this.eventEmitter.emit(WhatsAppBotEvents.LEAD_CREATED, {
          leadId: lead.id,
          conversationId,
          phone: phoneNumber,
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to create lead: ${error.message}`);
    }
  }

  /**
   * Create a lead from qualification data
   */
  private async createLeadFromQualification(
    conversationId: string,
    qualificationData: QualificationData,
    phoneNumber: string,
  ) {
    // Check if lead already exists for this phone
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        tenantId: this.defaultTenantId,
        phone: phoneNumber,
      },
    });

    if (existingLead) {
      // Update existing lead
      return this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          firstName: qualificationData.name || existingLead.firstName,
          propertyType: qualificationData.propertyType || existingLead.propertyType,
          budget: qualificationData.budget?.max || existingLead.budget,
          location: qualificationData.location?.city || existingLead.location,
          score: qualificationData.qualificationScore || existingLead.score,
          status: 'qualified',
        },
      });
    }

    // Create new lead
    return this.prisma.lead.create({
      data: {
        tenantId: this.defaultTenantId,
        firstName: qualificationData.name || 'عميل واتساب',
        phone: phoneNumber,
        whatsapp: phoneNumber,
        source: 'whatsapp_bot',
        sourceId: conversationId,
        status: 'qualified',
        propertyType: qualificationData.propertyType,
        budget: qualificationData.budget?.max,
        location: qualificationData.location?.city,
        score: qualificationData.qualificationScore || 0,
        notes: `تم التأهيل عبر بوت الواتساب. الجدول الزمني: ${qualificationData.timeline || 'غير محدد'}`,
      },
    });
  }

  /**
   * Manually trigger bot response (for testing)
   */
  async sendManualResponse(conversationId: string, text: string): Promise<BotResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const result = await this.sendBotResponse(conversationId, conversation.channelId, text);

    return {
      success: true,
      conversationId,
      messageId: result.messageId,
      responseText: text,
    };
  }

  /**
   * Get bot status
   */
  getBotStatus(): {
    enabled: boolean;
    llmAvailable: boolean;
    senderConfigured: boolean;
  } {
    return {
      enabled: this.botEnabled,
      llmAvailable: this.llmService.isAvailable(),
      senderConfigured: this.senderService.isConfigured(),
    };
  }
}
