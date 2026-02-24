// src/modules/integrations/whatsapp/whatsapp-sender.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';
import {
  WhatsAppSenderService,
  WhatsAppSenderEvents,
  MessageJobData,
} from './whatsapp-sender.service';
import { WhatsAppTransformerService } from './whatsapp-transformer.service';
import { WhatsAppQuotaService } from './whatsapp-quota.service';
import { WHATSAPP_QUEUE } from './constants';
import { WHATSAPP_ADAPTER } from './interfaces/whatsapp-adapter.interface';

describe('WhatsAppSenderService', () => {
  let service: WhatsAppSenderService;
  let adapter: any;
  let messageQueue: any;
  let transformer: any;
  let quotaService: any;
  let eventEmitter: any;

  const mockTenantId = 'tenant-123';
  const mockConversationId = 'conv-123';
  const mockPhoneNumber = '+966501234567';

  beforeEach(async () => {
    adapter = {
      sendTextMessage: jest.fn(),
      sendTemplateMessage: jest.fn(),
      sendMediaMessage: jest.fn(),
      sendLocationMessage: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('twilio'),
    };

    messageQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getFailed: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getFailedCount: jest.fn(),
      clean: jest.fn(),
    };

    transformer = {
      formatPhoneForWhatsApp: jest.fn().mockImplementation((phone: string) =>
        phone.replace('+', '')),
    };

    quotaService = {
      canSendMessage: jest.fn().mockResolvedValue({ allowed: true }),
      checkContactRateLimit: jest.fn().mockReturnValue({
        allowed: true,
        messagesInWindow: 0,
        maxMessages: 10,
      }),
      recordContactMessage: jest.fn(),
      incrementUsage: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSenderService,
        { provide: WHATSAPP_ADAPTER, useValue: adapter },
        { provide: getQueueToken(WHATSAPP_QUEUE), useValue: messageQueue },
        { provide: WhatsAppTransformerService, useValue: transformer },
        { provide: WhatsAppQuotaService, useValue: quotaService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'whatsapp.maxBotRetries': 3,
                WHATSAPP_RETRY_DELAY_MS: 1000,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppSenderService>(WhatsAppSenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // DIRECT SENDING (Synchronous)
  // ==========================================

  describe('sendTextMessage', () => {
    it('should send text message directly', async () => {
      adapter.sendTextMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.sendTextMessage(mockPhoneNumber, 'مرحبا');

      expect(transformer.formatPhoneForWhatsApp).toHaveBeenCalledWith(mockPhoneNumber);
      expect(adapter.sendTextMessage).toHaveBeenCalledWith('966501234567', 'مرحبا');
      expect(result.success).toBe(true);
      expect(result.externalId).toBe('SM123456');
    });

    it('should return error on send failure', async () => {
      adapter.sendTextMessage.mockResolvedValue({
        success: false,
        error: 'API error',
        errorCode: '500',
      });

      const result = await service.sendTextMessage(mockPhoneNumber, 'مرحبا');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message directly', async () => {
      adapter.sendTemplateMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.sendTemplateMessage(
        mockPhoneNumber,
        'welcome_template',
        { language: 'ar' },
      );

      expect(adapter.sendTemplateMessage).toHaveBeenCalledWith(
        '966501234567',
        'welcome_template',
        { language: 'ar' },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendMediaMessage', () => {
    it('should send image message directly', async () => {
      adapter.sendMediaMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.sendMediaMessage(
        mockPhoneNumber,
        'https://example.com/image.jpg',
        'image',
        { caption: 'صورة العقار' },
      );

      expect(adapter.sendMediaMessage).toHaveBeenCalledWith(
        '966501234567',
        'https://example.com/image.jpg',
        'image',
        { caption: 'صورة العقار' },
      );
      expect(result.success).toBe(true);
    });

    it('should send audio message', async () => {
      adapter.sendMediaMessage.mockResolvedValue({ success: true });

      await service.sendMediaMessage(
        mockPhoneNumber,
        'https://example.com/audio.ogg',
        'audio',
      );

      expect(adapter.sendMediaMessage).toHaveBeenCalledWith(
        '966501234567',
        'https://example.com/audio.ogg',
        'audio',
        undefined,
      );
    });

    it('should send video message', async () => {
      adapter.sendMediaMessage.mockResolvedValue({ success: true });

      await service.sendMediaMessage(
        mockPhoneNumber,
        'https://example.com/video.mp4',
        'video',
      );

      expect(adapter.sendMediaMessage).toHaveBeenCalledWith(
        '966501234567',
        'https://example.com/video.mp4',
        'video',
        undefined,
      );
    });

    it('should send document message', async () => {
      adapter.sendMediaMessage.mockResolvedValue({ success: true });

      await service.sendMediaMessage(
        mockPhoneNumber,
        'https://example.com/doc.pdf',
        'document',
        { filename: 'brochure.pdf' },
      );

      expect(adapter.sendMediaMessage).toHaveBeenCalledWith(
        '966501234567',
        'https://example.com/doc.pdf',
        'document',
        { filename: 'brochure.pdf' },
      );
    });
  });

  describe('sendLocationMessage', () => {
    it('should send location message directly', async () => {
      adapter.sendLocationMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.sendLocationMessage(
        mockPhoneNumber,
        24.7136,
        46.6753,
        'الرياض',
        'طريق الملك فهد',
      );

      expect(adapter.sendLocationMessage).toHaveBeenCalledWith(
        '966501234567',
        24.7136,
        46.6753,
        'الرياض',
        'طريق الملك فهد',
      );
      expect(result.success).toBe(true);
    });
  });

  // ==========================================
  // QUEUED SENDING (Asynchronous)
  // ==========================================

  describe('queueMessage', () => {
    it('should queue message successfully', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.queueMessage({
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: mockPhoneNumber,
        type: 'text',
        content: 'مرحبا',
      });

      expect(quotaService.canSendMessage).toHaveBeenCalledWith(mockTenantId);
      expect(quotaService.checkContactRateLimit).toHaveBeenCalledWith(
        mockTenantId,
        mockPhoneNumber,
      );
      expect(messageQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          id: 'msg-123',
          type: 'text',
          content: 'مرحبا',
        }),
        expect.any(Object),
      );
      expect(result.success).toBe(true);
      expect(result.queuedJobId).toBe('job-123');
    });

    it('should reject when quota exceeded', async () => {
      quotaService.canSendMessage.mockResolvedValue({
        allowed: false,
        reason: 'Daily limit reached',
      });

      const result = await service.queueMessage({
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: mockPhoneNumber,
        type: 'text',
        content: 'مرحبا',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily limit reached');
      expect(result.errorCode).toBe('QUOTA_EXCEEDED');
      expect(messageQueue.add).not.toHaveBeenCalled();
    });

    it('should reject when rate limited', async () => {
      quotaService.checkContactRateLimit.mockReturnValue({
        allowed: false,
        retryAfterMs: 60000,
        messagesInWindow: 10,
        maxMessages: 10,
      });

      const result = await service.queueMessage({
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: mockPhoneNumber,
        type: 'text',
        content: 'مرحبا',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(messageQueue.add).not.toHaveBeenCalled();
    });

    it('should emit MESSAGE_QUEUED event', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.queueMessage({
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: mockPhoneNumber,
        type: 'text',
        content: 'مرحبا',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_QUEUED,
        expect.objectContaining({
          jobId: 'job-123',
          messageId: 'msg-123',
          conversationId: mockConversationId,
        }),
      );
    });

    it('should record message for quota and rate limiting', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.queueMessage({
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: mockPhoneNumber,
        type: 'text',
        content: 'مرحبا',
      });

      expect(quotaService.recordContactMessage).toHaveBeenCalledWith(
        mockTenantId,
        mockPhoneNumber,
      );
      expect(quotaService.incrementUsage).toHaveBeenCalledWith(mockTenantId, 1);
    });
  });

  describe('queueTextMessage', () => {
    it('should queue text message', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.queueTextMessage(
        'msg-123',
        mockTenantId,
        mockConversationId,
        mockPhoneNumber,
        'مرحبا',
      );

      expect(result.success).toBe(true);
      expect(messageQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          type: 'text',
          content: 'مرحبا',
        }),
        expect.any(Object),
      );
    });
  });

  describe('queueTemplateMessage', () => {
    it('should queue template message', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.queueTemplateMessage(
        'msg-123',
        mockTenantId,
        mockConversationId,
        mockPhoneNumber,
        'welcome_template',
        { language: 'ar' },
      );

      expect(result.success).toBe(true);
      expect(messageQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          type: 'template',
          templateName: 'welcome_template',
        }),
        expect.any(Object),
      );
    });
  });

  describe('queueMediaMessage', () => {
    it('should queue media message', async () => {
      messageQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.queueMediaMessage(
        'msg-123',
        mockTenantId,
        mockConversationId,
        mockPhoneNumber,
        'https://example.com/image.jpg',
        'image',
        'صورة العقار',
      );

      expect(result.success).toBe(true);
      expect(messageQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          type: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          caption: 'صورة العقار',
        }),
        expect.any(Object),
      );
    });
  });

  // ==========================================
  // QUEUE PROCESSING
  // ==========================================

  describe('processMessageJob', () => {
    const mockJob = {
      id: 'job-123',
      data: {
        id: 'msg-123',
        tenantId: mockTenantId,
        conversationId: mockConversationId,
        to: '966501234567',
        type: 'text' as const,
        content: 'مرحبا',
        createdAt: new Date(),
      },
      attemptsMade: 0,
    } as Job<MessageJobData>;

    it('should process text message job', async () => {
      adapter.sendTextMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.processMessageJob(mockJob);

      expect(adapter.sendTextMessage).toHaveBeenCalledWith('966501234567', 'مرحبا');
      expect(result.success).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_SENT,
        expect.objectContaining({
          jobId: 'job-123',
          messageId: 'msg-123',
          externalId: 'SM123456',
        }),
      );
    });

    it('should process template message job', async () => {
      const templateJob = {
        ...mockJob,
        data: {
          ...mockJob.data,
          type: 'template' as const,
          templateName: 'welcome_template',
          templateOptions: { language: 'ar' },
        },
      } as Job<MessageJobData>;

      adapter.sendTemplateMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        externalId: 'SM123456',
      });

      const result = await service.processMessageJob(templateJob);

      expect(adapter.sendTemplateMessage).toHaveBeenCalledWith(
        '966501234567',
        'welcome_template',
        { language: 'ar' },
      );
      expect(result.success).toBe(true);
    });

    it('should process image message job', async () => {
      const imageJob = {
        ...mockJob,
        data: {
          ...mockJob.data,
          type: 'image' as const,
          mediaUrl: 'https://example.com/image.jpg',
          caption: 'صورة',
        },
      } as Job<MessageJobData>;

      adapter.sendMediaMessage.mockResolvedValue({ success: true });

      const result = await service.processMessageJob(imageJob);

      expect(adapter.sendMediaMessage).toHaveBeenCalledWith(
        '966501234567',
        'https://example.com/image.jpg',
        'image',
        { caption: 'صورة', filename: undefined },
      );
      expect(result.success).toBe(true);
    });

    it('should process location message job', async () => {
      const locationJob = {
        ...mockJob,
        data: {
          ...mockJob.data,
          type: 'location' as const,
          location: {
            latitude: 24.7136,
            longitude: 46.6753,
            name: 'الرياض',
          },
        },
      } as Job<MessageJobData>;

      adapter.sendLocationMessage.mockResolvedValue({ success: true });

      const result = await service.processMessageJob(locationJob);

      expect(adapter.sendLocationMessage).toHaveBeenCalledWith(
        '966501234567',
        24.7136,
        46.6753,
        'الرياض',
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('should return error for location job without location data', async () => {
      const locationJob = {
        ...mockJob,
        data: {
          ...mockJob.data,
          type: 'location' as const,
        },
      } as Job<MessageJobData>;

      const result = await service.processMessageJob(locationJob);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location data missing');
    });

    it('should emit sending event', async () => {
      adapter.sendTextMessage.mockResolvedValue({ success: true });

      await service.processMessageJob(mockJob);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_SENDING,
        expect.objectContaining({
          jobId: 'job-123',
          messageId: 'msg-123',
          attempt: 1,
        }),
      );
    });

    it('should emit failed event on final attempt failure', async () => {
      const failingJob = {
        ...mockJob,
        attemptsMade: 2, // This is the 3rd attempt (max)
      } as Job<MessageJobData>;

      adapter.sendTextMessage.mockRejectedValue(new Error('API Error'));

      await expect(service.processMessageJob(failingJob)).rejects.toThrow('API Error');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_FAILED,
        expect.objectContaining({
          jobId: 'job-123',
          messageId: 'msg-123',
          error: 'API Error',
        }),
      );
    });
  });

  // ==========================================
  // QUEUE MANAGEMENT
  // ==========================================

  describe('getPendingJobsCount', () => {
    it('should return pending jobs count', async () => {
      messageQueue.getWaitingCount.mockResolvedValue(5);

      const count = await service.getPendingJobsCount();

      expect(count).toBe(5);
    });
  });

  describe('getActiveJobsCount', () => {
    it('should return active jobs count', async () => {
      messageQueue.getActiveCount.mockResolvedValue(3);

      const count = await service.getActiveJobsCount();

      expect(count).toBe(3);
    });
  });

  describe('getFailedJobsCount', () => {
    it('should return failed jobs count', async () => {
      messageQueue.getFailedCount.mockResolvedValue(2);

      const count = await service.getFailedJobsCount();

      expect(count).toBe(2);
    });
  });

  describe('retryFailedJob', () => {
    it('should retry failed job', async () => {
      const mockJob = { retry: jest.fn() };
      messageQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.retryFailedJob('job-123');

      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      messageQueue.getJob.mockResolvedValue(null);

      const result = await service.retryFailedJob('job-999');

      expect(result).toBe(false);
    });
  });

  describe('retryAllFailedJobs', () => {
    it('should retry all failed jobs', async () => {
      const mockJobs = [
        { id: 'job-1', retry: jest.fn() },
        { id: 'job-2', retry: jest.fn() },
      ];
      messageQueue.getFailed.mockResolvedValue(mockJobs);

      const count = await service.retryAllFailedJobs();

      expect(count).toBe(2);
      expect(mockJobs[0].retry).toHaveBeenCalled();
      expect(mockJobs[1].retry).toHaveBeenCalled();
    });
  });

  describe('removeFailedJob', () => {
    it('should remove failed job', async () => {
      const mockJob = { remove: jest.fn() };
      messageQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.removeFailedJob('job-123');

      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  // ==========================================
  // STATUS UPDATES
  // ==========================================

  describe('emitStatusUpdate', () => {
    it('should emit status update event', () => {
      service.emitStatusUpdate('msg-123', 'SM123456', 'delivered');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_STATUS_UPDATED,
        expect.objectContaining({
          messageId: 'msg-123',
          externalId: 'SM123456',
          status: 'delivered',
        }),
      );
    });

    it('should emit status update with error', () => {
      service.emitStatusUpdate('msg-123', 'SM123456', 'failed', {
        code: '500',
        message: 'Delivery failed',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        WhatsAppSenderEvents.MESSAGE_STATUS_UPDATED,
        expect.objectContaining({
          messageId: 'msg-123',
          status: 'failed',
          error: { code: '500', message: 'Delivery failed' },
        }),
      );
    });
  });

  // ==========================================
  // HELPERS
  // ==========================================

  describe('isConfigured', () => {
    it('should return adapter configuration status', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(service.getProviderName()).toBe('twilio');
    });
  });
});
