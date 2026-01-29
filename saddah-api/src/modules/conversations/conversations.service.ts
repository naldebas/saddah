// src/modules/conversations/conversations.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { CreateConversationDto, ConversationStatus } from './dto/create-conversation.dto';
import { UpdateConversationDto, CloseConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto, QueryMessagesDto } from './dto/query-conversations.dto';
import { SendMessageDto, IncomingMessageDto, MessageDirection } from './dto/send-message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new conversation
   */
  async create(tenantId: string, dto: CreateConversationDto) {
    // Check if conversation already exists for this channelId
    const existing = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        channelId: dto.channelId,
        channel: dto.channel,
        status: { notIn: ['closed', 'resolved'] },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        tenantId,
        channel: dto.channel,
        channelId: dto.channelId,
        contactId: dto.contactId,
        assignedToId: dto.assignedToId,
        status: dto.status || 'bot',
        qualificationData: dto.qualificationData || {},
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find all conversations with pagination and filters
   */
  async findAll(tenantId: string, query: QueryConversationsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      channel,
      assignedToId,
      contactId,
      unassignedOnly,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(channel && { channel }),
      ...(contactId && { contactId }),
      ...(assignedToId && { assignedToId }),
      ...(unassignedOnly && { assignedToId: null }),
      ...(search && {
        OR: [
          { channelId: { contains: search } },
          {
            contact: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search } },
              ],
            },
          },
        ],
      }),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              type: true,
              sender: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get conversation by ID
   */
  async findOne(tenantId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('المحادثة غير موجودة');
    }

    return conversation;
  }

  /**
   * Get conversation by channel ID (e.g., WhatsApp number)
   */
  async findByChannelId(tenantId: string, channel: string, channelId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        tenantId,
        channel,
        channelId,
        status: { notIn: ['closed', 'resolved'] },
      },
      include: {
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Update conversation
   */
  async update(tenantId: string, id: string, dto: UpdateConversationDto) {
    await this.findOne(tenantId, id);

    return this.prisma.conversation.update({
      where: { id },
      data: {
        ...(dto.contactId !== undefined && { contactId: dto.contactId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.status && { status: dto.status }),
        ...(dto.qualificationData && {
          qualificationData: dto.qualificationData
        }),
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Assign conversation to a user
   */
  async assign(tenantId: string, id: string, assignedToId: string) {
    const conversation = await this.findOne(tenantId, id);

    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id: assignedToId, tenantId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        assignedToId,
        status: conversation.status === 'bot' ? 'active' : conversation.status,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify the assigned user
    const contactName = updated.contact
      ? `${updated.contact.firstName} ${updated.contact.lastName}`
      : updated.channelId;

    await this.notificationsService.notifyNewMessage(
      tenantId,
      assignedToId,
      contactName,
      id,
    );

    return updated;
  }

  /**
   * Close a conversation
   */
  async close(tenantId: string, id: string, dto: CloseConversationDto) {
    await this.findOne(tenantId, id);

    return this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedReason: dto.reason,
      },
    });
  }

  /**
   * Reopen a closed conversation
   */
  async reopen(tenantId: string, id: string) {
    const conversation = await this.findOne(tenantId, id);

    if (!['closed', 'resolved'].includes(conversation.status)) {
      throw new BadRequestException('المحادثة ليست مغلقة');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: {
        status: conversation.assignedToId ? 'active' : 'pending',
        closedAt: null,
        closedReason: null,
      },
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(tenantId: string, conversationId: string, query: QueryMessagesDto) {
    const { page = 1, limit = 50, before, after } = query;

    // Verify conversation exists and belongs to tenant
    await this.findOne(tenantId, conversationId);

    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(before && { createdAt: { lt: (await this.prisma.message.findUnique({ where: { id: before } }))?.createdAt } }),
      ...(after && { createdAt: { gt: (await this.prisma.message.findUnique({ where: { id: after } }))?.createdAt } }),
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip: before || after ? 0 : skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    // Return in chronological order
    return {
      data: messages.reverse(),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(tenantId: string, conversationId: string, dto: SendMessageDto) {
    // Verify conversation exists
    const conversation = await this.findOne(tenantId, conversationId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: dto.direction,
        sender: dto.sender,
        type: dto.type || 'text',
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        duration: dto.duration,
        externalId: dto.externalId,
        status: dto.direction === MessageDirection.OUTBOUND ? 'pending' : 'received',
      },
    });

    // Update last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Handle incoming message from external channel
   * Creates conversation if doesn't exist
   */
  async handleIncomingMessage(tenantId: string, dto: IncomingMessageDto) {
    // Find or create conversation
    let conversation = await this.findByChannelId(tenantId, dto.channel, dto.channelId);

    if (!conversation) {
      conversation = await this.create(tenantId, {
        channel: dto.channel as any,
        channelId: dto.channelId,
        status: 'bot' as any,
      });
    }

    // Create the message
    const message = await this.sendMessage(tenantId, conversation.id, {
      direction: MessageDirection.INBOUND,
      sender: dto.sender,
      type: dto.type,
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      duration: dto.duration,
      externalId: dto.externalId,
    });

    // Notify assigned user if exists
    if (conversation.assignedToId) {
      const contactName = conversation.contact
        ? `${conversation.contact.firstName} ${conversation.contact.lastName}`
        : conversation.channelId;

      await this.notificationsService.notifyNewMessage(
        tenantId,
        conversation.assignedToId,
        contactName,
        conversation.id,
      );
    }

    return { conversation, message };
  }

  /**
   * Link conversation to a contact
   */
  async linkToContact(tenantId: string, id: string, contactId: string) {
    await this.findOne(tenantId, id);

    // Verify contact exists
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId, isActive: true },
    });

    if (!contact) {
      throw new NotFoundException('جهة الاتصال غير موجودة');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { contactId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get conversation statistics for dashboard
   */
  async getStatistics(tenantId: string) {
    const [
      total,
      active,
      pending,
      closed,
      unassigned,
      byChannel,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'active' } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'pending' } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'closed' } }),
      this.prisma.conversation.count({ where: { tenantId, assignedToId: null, status: { notIn: ['closed', 'resolved'] } } }),
      this.prisma.conversation.groupBy({
        by: ['channel'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      pending,
      closed,
      unassigned,
      byChannel: byChannel.reduce((acc, item) => {
        acc[item.channel] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get conversations assigned to a specific user
   */
  async getMyConversations(tenantId: string, userId: string, query: QueryConversationsDto) {
    return this.findAll(tenantId, { ...query, assignedToId: userId });
  }
}
