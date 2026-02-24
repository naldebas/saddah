// src/modules/integrations/whatsapp/whatsapp-bot.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppBotService, WhatsAppBotEvents } from './whatsapp-bot.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { WhatsAppTransformerService, TransformedMessage } from './whatsapp-transformer.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppContactSyncService } from './whatsapp-contact-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { LlmService } from '../../ai/llm.service';
import { StateMachineService } from '../../ai/state-machine/state-machine.service';
import { ContextService } from '../../ai/context/context.service';
import { SaudiDialectService } from '../../ai/dialect/saudi-dialect.service';
import { QualificationState, createInitialQualificationData } from '../../ai/state-machine/states';
import { MessageType, MessageDirection, MessageSender } from '../../conversations/dto/send-message.dto';
import { ConversationChannel, ConversationStatus } from '../../conversations/dto/create-conversation.dto';

describe('WhatsAppBotService', () => {
  let service: WhatsAppBotService;
  let prisma: any;
  let senderService: any;
  let transformer: any;
  let llmService: any;
  let stateMachine: any;
  let contextService: any;
  let contactSyncService: any;
  let eventEmitter: any;
  let webhookController: any;

  const mockTenantId = 'tenant-123';
  const mockPhoneNumber = '+966501234567';
  const mockConversationId = 'conv-123';

  beforeEach(async () => {
    prisma = {
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lead: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    senderService = {
      queueTextMessage: jest.fn(),
      queueTemplateMessage: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    transformer = {
      transformIncomingMessage: jest.fn(),
      formatPhoneForWhatsApp: jest.fn(),
    };

    llmService = {
      isAvailable: jest.fn().mockReturnValue(true),
      chat: jest.fn(),
    };

    stateMachine = {
      processMessage: jest.fn(),
      getCurrentState: jest.fn(),
    };

    contextService = {
      buildMinimalContext: jest.fn().mockReturnValue([]),
    };

    contactSyncService = {
      findOrCreateFromWhatsApp: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    webhookController = {
      registerHandler: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppBotService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppSenderService, useValue: senderService },
        { provide: WhatsAppTransformerService, useValue: transformer },
        { provide: LlmService, useValue: llmService },
        { provide: StateMachineService, useValue: stateMachine },
        { provide: ContextService, useValue: contextService },
        { provide: SaudiDialectService, useValue: { detectIntent: jest.fn(), extractEntities: jest.fn() } },
        { provide: WhatsAppContactSyncService, useValue: contactSyncService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: WhatsAppWebhookController, useValue: webhookController },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'whatsapp.botEnabled': true,
                'whatsapp.botGreeting': 'مرحباً! كيف يمكنني مساعدتك؟',
                'whatsapp.humanHandoffKeywords': ['مساعدة', 'موظف', 'بشري'],
                'whatsapp.maxBotRetries': 3,
                DEFAULT_TENANT_ID: mockTenantId,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppBotService>(WhatsAppBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register as webhook handler', () => {
      service.onModuleInit();
      expect(webhookController.registerHandler).toHaveBeenCalledWith(service);
    });
  });

  describe('processMessage', () => {
    const mockMessage: TransformedMessage = {
      channelId: mockPhoneNumber,
      channel: ConversationChannel.WHATSAPP,
      messageId: 'msg-123',
      externalId: 'ext-123',
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
      type: MessageType.TEXT,
      content: 'مرحبا، أبي فيلا بالرياض',
      timestamp: new Date(),
    };

    const mockConversation = {
      id: mockConversationId,
      tenantId: mockTenantId,
      channelId: mockPhoneNumber,
      channel: ConversationChannel.WHATSAPP,
      status: 'bot',
      qualificationData: createInitialQualificationData(),
      contactId: null,
    };

    beforeEach(() => {
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.conversation.update.mockResolvedValue(mockConversation);
      prisma.message.create.mockResolvedValue({
        id: 'msg-new',
        conversationId: mockConversationId,
        direction: MessageDirection.OUTBOUND,
        sender: MessageSender.BOT,
        type: 'text',
        content: 'Response',
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.message.findMany.mockResolvedValue([]);

      stateMachine.processMessage.mockReturnValue({
        responseType: 'prompt',
        nextState: QualificationState.ASK_PROPERTY_TYPE,
        updatedData: {
          ...createInitialQualificationData(),
          state: QualificationState.ASK_PROPERTY_TYPE,
        },
      });

      llmService.chat.mockResolvedValue({
        content: 'مرحباً! ما نوع العقار اللي تبحث عنه؟',
        model: 'gpt-4',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          model: 'gpt-4',
          timestamp: new Date(),
        },
      });

      senderService.queueTextMessage.mockResolvedValue({
        success: true,
        queuedJobId: 'job-123',
      });

      contactSyncService.findOrCreateFromWhatsApp.mockResolvedValue({
        type: 'created_lead',
        contact: undefined,
        lead: undefined,
      });
    });

    it('should process message successfully with existing conversation', async () => {
      const result = await service.processMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe(mockConversationId);
      expect(result.state).toBe(QualificationState.ASK_PROPERTY_TYPE);
      expect(result.handoffTriggered).toBe(false);
    });

    it('should create new conversation if not exists', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.processMessage(mockMessage);

      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppBotEvents.CONVERSATION_STARTED,
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });

    it('should skip processing if conversation not in bot mode', async () => {
      prisma.conversation.findFirst.mockResolvedValue({
        ...mockConversation,
        status: 'pending',
      });

      const result = await service.processMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(llmService.chat).not.toHaveBeenCalled();
    });

    it('should trigger handoff on handoff keywords', async () => {
      const handoffMessage: TransformedMessage = {
        ...mockMessage,
        content: 'أبي أكلم موظف',
      };

      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      const result = await service.processMessage(handoffMessage);

      expect(result.success).toBe(true);
      expect(result.handoffTriggered).toBe(true);
      expect(result.state).toBe(QualificationState.HUMAN_HANDOFF);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppBotEvents.HANDOFF_TRIGGERED,
        expect.any(Object),
      );
    });

    it('should trigger handoff from state machine', async () => {
      stateMachine.processMessage.mockReturnValue({
        responseType: 'handoff',
        nextState: QualificationState.HUMAN_HANDOFF,
        updatedData: {
          ...createInitialQualificationData(),
          state: QualificationState.HUMAN_HANDOFF,
          handoffReason: 'Complex query',
        },
      });

      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      const result = await service.processMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(result.handoffTriggered).toBe(true);
    });

    it('should use fallback response when LLM is unavailable', async () => {
      llmService.isAvailable.mockReturnValue(false);

      const result = await service.processMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(llmService.chat).not.toHaveBeenCalled();
      expect(senderService.queueTextMessage).toHaveBeenCalled();
    });

    it('should save incoming message to database', async () => {
      await service.processMessage(mockMessage);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: mockConversationId,
          direction: MessageDirection.INBOUND,
          sender: MessageSender.CONTACT,
          content: mockMessage.content,
        }),
      });
    });

    it('should emit MESSAGE_PROCESSED event', async () => {
      await service.processMessage(mockMessage);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppBotEvents.MESSAGE_PROCESSED,
        expect.objectContaining({
          conversationId: mockConversationId,
        }),
      );
    });

    it('should handle LLM error gracefully', async () => {
      llmService.chat.mockRejectedValue(new Error('LLM unavailable'));

      const result = await service.processMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(senderService.queueTextMessage).toHaveBeenCalled();
    });

    it('should link contact if found by contact sync', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);
      contactSyncService.findOrCreateFromWhatsApp.mockResolvedValue({
        type: 'contact',
        contact: { id: 'contact-123' },
        lead: undefined,
      });

      await service.processMessage(mockMessage);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: 'contact-123',
        }),
      });
    });
  });

  describe('getBotStatus', () => {
    it('should return bot status', () => {
      const status = service.getBotStatus();

      expect(status).toEqual({
        enabled: true,
        llmAvailable: true,
        senderConfigured: true,
      });
    });
  });

  describe('sendManualResponse', () => {
    it('should send manual response for existing conversation', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: mockConversationId,
        channelId: mockPhoneNumber,
      });
      prisma.message.create.mockResolvedValue({
        id: 'msg-new',
        content: 'Test response',
      });
      senderService.queueTextMessage.mockResolvedValue({
        success: true,
        queuedJobId: 'job-123',
      });

      const result = await service.sendManualResponse(mockConversationId, 'Test response');

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe(mockConversationId);
      expect(result.responseText).toBe('Test response');
    });

    it('should return error for non-existent conversation', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      const result = await service.sendManualResponse('non-existent', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation not found');
    });
  });
});
