import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  createMockConversation,
  createMockMessage,
  createMockContact,
  createMockUser,
  createMockNotification,
} from '../../../test/utils/mock-factory';
import { MessageDirection, MessageSender } from './dto/send-message.dto';
import { ConversationChannel, ConversationStatus } from './dto/create-conversation.dto';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: any;
  let notificationsService: any;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';

  beforeEach(async () => {
    prisma = {
      conversation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      message: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      contact: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    notificationsService = {
      notifyNewMessage: jest.fn().mockResolvedValue(createMockNotification()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create conversation with default bot status', async () => {
      const newConversation = createMockConversation({ tenantId, status: ConversationStatus.BOT });
      prisma.conversation.findFirst.mockResolvedValue(null); // No existing conversation
      prisma.conversation.create.mockResolvedValue(newConversation);

      const result = await service.create(tenantId, {
        channel: ConversationChannel.WHATSAPP,
        channelId: '+966501234567',
      });

      expect(result.status).toBe('bot');
      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            channel: ConversationChannel.WHATSAPP,
            channelId: '+966501234567',
            status: 'bot',
          }),
        }),
      );
    });

    it('should return existing conversation if one exists', async () => {
      const existingConversation = createMockConversation({
        tenantId,
        channelId: '+966501234567',
        channel: ConversationChannel.WHATSAPP,
      });
      prisma.conversation.findFirst.mockResolvedValue(existingConversation);

      const result = await service.create(tenantId, {
        channel: ConversationChannel.WHATSAPP,
        channelId: '+966501234567',
      });

      expect(result.id).toBe(existingConversation.id);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create conversation with contact if provided', async () => {
      const contact = createMockContact({ tenantId });
      const conversation = createMockConversation({ tenantId, contactId: contact.id });

      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(conversation);

      const result = await service.create(tenantId, {
        channel: ConversationChannel.WHATSAPP,
        channelId: '+966501234567',
        contactId: contact.id,
      });

      expect(result.contactId).toBe(contact.id);
    });
  });

  describe('findAll', () => {
    it('should list conversations with pagination', async () => {
      const conversations = Array.from({ length: 5 }, () =>
        createMockConversation({ tenantId }),
      );
      prisma.conversation.findMany.mockResolvedValue(conversations);
      prisma.conversation.count.mockResolvedValue(25);

      const result = await service.findAll(tenantId, { page: 1, limit: 5 });

      expect(result.data).toHaveLength(5);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should filter by status', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.conversation.count.mockResolvedValue(0);

      await service.findAll(tenantId, { status: ConversationStatus.ACTIVE });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('should filter by channel', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.conversation.count.mockResolvedValue(0);

      await service.findAll(tenantId, { channel: ConversationChannel.WHATSAPP });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: ConversationChannel.WHATSAPP }),
        }),
      );
    });

    it('should filter unassigned only', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.conversation.count.mockResolvedValue(0);

      await service.findAll(tenantId, { unassignedOnly: true });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedToId: null }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return conversation by id', async () => {
      const conversation = createMockConversation({ tenantId });
      prisma.conversation.findFirst.mockResolvedValue(conversation);

      const result = await service.findOne(tenantId, conversation.id);

      expect(result.id).toBe(conversation.id);
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendMessage', () => {
    it('should handle incoming message', async () => {
      const conversation = createMockConversation({ tenantId });
      const message = createMockMessage({
        conversationId: conversation.id,
        direction: 'inbound',
      });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.message.create.mockResolvedValue(message);
      prisma.conversation.update.mockResolvedValue(conversation);

      const result = await service.sendMessage(tenantId, conversation.id, {
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        content: 'Hello',
      });

      expect(result.direction).toBe('inbound');
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: MessageDirection.INBOUND,
            status: 'received',
          }),
        }),
      );
    });

    it('should send outbound message', async () => {
      const conversation = createMockConversation({ tenantId });
      const message = createMockMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        status: 'pending',
      });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.message.create.mockResolvedValue(message);
      prisma.conversation.update.mockResolvedValue(conversation);

      const result = await service.sendMessage(tenantId, conversation.id, {
        direction: MessageDirection.OUTBOUND,
        sender: MessageSender.BOT,
        content: 'Welcome!',
      });

      expect(result.direction).toBe('outbound');
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: MessageDirection.OUTBOUND,
            status: 'pending',
          }),
        }),
      );
    });

    it('should update last message timestamp', async () => {
      const conversation = createMockConversation({ tenantId });
      const message = createMockMessage({ conversationId: conversation.id });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.message.create.mockResolvedValue(message);
      prisma.conversation.update.mockResolvedValue(conversation);

      await service.sendMessage(tenantId, conversation.id, {
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        content: 'Test',
      });

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversation.id },
        data: { lastMessageAt: expect.any(Date) },
      });
    });
  });

  describe('assign', () => {
    it('should assign to user', async () => {
      const conversation = createMockConversation({ tenantId, status: ConversationStatus.BOT });
      const user = createMockUser({ tenantId });
      const assignedConversation = {
        ...conversation,
        assignedToId: user.id,
        status: 'active',
        contact: null,
      };

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.conversation.update.mockResolvedValue(assignedConversation);

      const result = await service.assign(tenantId, conversation.id, user.id);

      expect(result.assignedToId).toBe(user.id);
      expect(result.status).toBe('active');
    });

    it('should transition status from bot to active', async () => {
      const conversation = createMockConversation({ tenantId, status: ConversationStatus.BOT });
      const user = createMockUser({ tenantId });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.conversation.update.mockResolvedValue({
        ...conversation,
        assignedToId: user.id,
        status: 'active',
        contact: null,
      });

      await service.assign(tenantId, conversation.id, user.id);

      expect(prisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('should notify assigned user', async () => {
      const conversation = createMockConversation({ tenantId });
      const user = createMockUser({ tenantId });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.conversation.update.mockResolvedValue({
        ...conversation,
        assignedToId: user.id,
        contact: null,
      });

      await service.assign(tenantId, conversation.id, user.id);

      expect(notificationsService.notifyNewMessage).toHaveBeenCalledWith(
        tenantId,
        user.id,
        expect.any(String),
        conversation.id,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const conversation = createMockConversation({ tenantId });
      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign(tenantId, conversation.id, 'non-existent-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('close', () => {
    it('should close conversation', async () => {
      const conversation = createMockConversation({ tenantId, status: ConversationStatus.ACTIVE });
      const closedConversation = {
        ...conversation,
        status: 'closed',
        closedAt: new Date(),
        closedReason: 'Resolved',
      };

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.conversation.update.mockResolvedValue(closedConversation);

      const result = await service.close(tenantId, conversation.id, {
        reason: 'Resolved',
      });

      expect(result.status).toBe('closed');
      expect(result.closedReason).toBe('Resolved');
    });
  });

  describe('reopen', () => {
    it('should reopen closed conversation', async () => {
      const conversation = createMockConversation({
        tenantId,
        status: ConversationStatus.CLOSED,
        assignedToId: userId,
      });
      const reopenedConversation = {
        ...conversation,
        status: 'active',
        closedAt: null,
        closedReason: null,
      };

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.conversation.update.mockResolvedValue(reopenedConversation);

      const result = await service.reopen(tenantId, conversation.id);

      expect(result.status).toBe('active');
      expect(result.closedAt).toBeNull();
    });

    it('should throw BadRequestException when conversation not closed', async () => {
      const conversation = createMockConversation({ tenantId, status: ConversationStatus.ACTIVE });
      prisma.conversation.findFirst.mockResolvedValue(conversation);

      await expect(service.reopen(tenantId, conversation.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('linkToContact', () => {
    it('should link conversation to contact', async () => {
      const conversation = createMockConversation({ tenantId });
      const contact = createMockContact({ tenantId });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.contact.findFirst.mockResolvedValue(contact);
      prisma.conversation.update.mockResolvedValue({
        ...conversation,
        contactId: contact.id,
        contact: { id: contact.id, firstName: contact.firstName, lastName: contact.lastName, phone: contact.phone },
      });

      const result = await service.linkToContact(tenantId, conversation.id, contact.id);

      expect(result.contactId).toBe(contact.id);
    });

    it('should throw NotFoundException when contact not found', async () => {
      const conversation = createMockConversation({ tenantId });
      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.linkToContact(tenantId, conversation.id, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should store qualification data', async () => {
      const conversation = createMockConversation({ tenantId });
      const qualificationData = {
        state: 'ask_property_type',
        name: 'محمد',
        propertyType: 'villa',
      };

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.conversation.update.mockResolvedValue({
        ...conversation,
        qualificationData,
      });

      const result = await service.update(tenantId, conversation.id, {
        qualificationData,
      });

      expect(result.qualificationData).toEqual(qualificationData);
    });

    it('should transition status correctly', async () => {
      const conversation = createMockConversation({ tenantId, status: ConversationStatus.BOT });

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.conversation.update.mockResolvedValue({
        ...conversation,
        status: ConversationStatus.PENDING,
      });

      const result = await service.update(tenantId, conversation.id, {
        status: ConversationStatus.PENDING,
      });

      expect(result.status).toBe('pending');
    });
  });

  describe('getMessages', () => {
    it('should return messages for conversation', async () => {
      const conversation = createMockConversation({ tenantId });
      const messages = Array.from({ length: 10 }, () =>
        createMockMessage({ conversationId: conversation.id }),
      );

      prisma.conversation.findFirst.mockResolvedValue(conversation);
      prisma.message.findMany.mockResolvedValue(messages);
      prisma.message.count.mockResolvedValue(100);

      const result = await service.getMessages(tenantId, conversation.id, {});

      expect(result.data).toHaveLength(10);
      expect(result.meta.total).toBe(100);
    });
  });

  describe('handleIncomingMessage', () => {
    it('should create conversation if does not exist', async () => {
      const newConversation = createMockConversation({ tenantId });
      const message = createMockMessage({ conversationId: newConversation.id });

      prisma.conversation.findFirst.mockResolvedValueOnce(null); // findByChannelId
      prisma.conversation.findFirst.mockResolvedValueOnce(null); // create check
      prisma.conversation.create.mockResolvedValue(newConversation);
      prisma.conversation.findFirst.mockResolvedValue(newConversation); // sendMessage check
      prisma.message.create.mockResolvedValue(message);
      prisma.conversation.update.mockResolvedValue(newConversation);

      const result = await service.handleIncomingMessage(tenantId, {
        channel: ConversationChannel.WHATSAPP,
        channelId: '+966501234567',
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        content: 'Hello',
      });

      expect(result.conversation).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should use existing conversation', async () => {
      const existingConversation = createMockConversation({ tenantId });
      const message = createMockMessage({ conversationId: existingConversation.id });

      prisma.conversation.findFirst.mockResolvedValue(existingConversation);
      prisma.message.create.mockResolvedValue(message);
      prisma.conversation.update.mockResolvedValue(existingConversation);

      const result = await service.handleIncomingMessage(tenantId, {
        channel: ConversationChannel.WHATSAPP,
        channelId: existingConversation.channelId,
        direction: MessageDirection.INBOUND,
        sender: MessageSender.CONTACT,
        content: 'Hello',
      });

      expect(result.conversation.id).toBe(existingConversation.id);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return conversation statistics', async () => {
      prisma.conversation.count.mockResolvedValueOnce(100); // total
      prisma.conversation.count.mockResolvedValueOnce(30);  // active
      prisma.conversation.count.mockResolvedValueOnce(20);  // pending
      prisma.conversation.count.mockResolvedValueOnce(40);  // closed
      prisma.conversation.count.mockResolvedValueOnce(15);  // unassigned
      prisma.conversation.groupBy.mockResolvedValue([
        { channel: 'whatsapp', _count: { id: 60 } },
        { channel: 'voice', _count: { id: 40 } },
      ]);

      const result = await service.getStatistics(tenantId);

      expect(result).toEqual({
        total: 100,
        active: 30,
        pending: 20,
        closed: 40,
        unassigned: 15,
        byChannel: {
          whatsapp: 60,
          voice: 40,
        },
      });
    });
  });

  describe('list by channel', () => {
    it('should filter conversations by whatsapp channel', async () => {
      const whatsappConversations = Array.from({ length: 3 }, () =>
        createMockConversation({ tenantId, channel: ConversationChannel.WHATSAPP }),
      );
      prisma.conversation.findMany.mockResolvedValue(whatsappConversations);
      prisma.conversation.count.mockResolvedValue(3);

      const result = await service.findAll(tenantId, { channel: ConversationChannel.WHATSAPP });

      expect(result.data).toHaveLength(3);
      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: ConversationChannel.WHATSAPP }),
        }),
      );
    });

    it('should filter conversations by voice channel', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.conversation.count.mockResolvedValue(0);

      await service.findAll(tenantId, { channel: ConversationChannel.VOICE });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: ConversationChannel.VOICE }),
        }),
      );
    });
  });

  describe('getMyConversations', () => {
    it('should return conversations assigned to specific user', async () => {
      const userConversations = Array.from({ length: 2 }, () =>
        createMockConversation({ tenantId, assignedToId: userId }),
      );
      prisma.conversation.findMany.mockResolvedValue(userConversations);
      prisma.conversation.count.mockResolvedValue(2);

      const result = await service.getMyConversations(tenantId, userId, {});

      expect(result.data).toHaveLength(2);
    });
  });
});
