// src/modules/integrations/botpress/botpress-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressClientService } from './botpress-client.service';

export interface BotpressConversationRecord {
  id: string;
  tenantId: string;
  conversationId: string;
  botpressConvId: string;
  botpressState: string | null;
  qualificationData: Record<string, any>;
  qualificationScore: number;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BotpressSyncService {
  private readonly logger = new Logger(BotpressSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: BotpressConfigService,
    private readonly clientService: BotpressClientService,
  ) {}

  /**
   * Ensure a Botpress conversation exists for the given Saddah conversation
   */
  async ensureBotpressConversation(
    tenantId: string,
    conversationId: string,
    channelId: string,
    senderName?: string,
  ): Promise<BotpressConversationRecord | null> {
    // Check if mapping already exists
    const existing = await this.prisma.botpressConversation.findUnique({
      where: {
        tenantId_conversationId: {
          tenantId,
          conversationId,
        },
      },
    });

    if (existing) {
      return existing as BotpressConversationRecord;
    }

    // Get config with credentials
    const configData = await this.configService.getConfigWithCredentials(tenantId);
    if (!configData) {
      this.logger.error(`No Botpress config found for tenant ${tenantId}`);
      return null;
    }

    const { config, credentials } = configData;

    try {
      // Create user in Botpress (using phone number as ID)
      const userResponse = await this.clientService.createUser(config.botId, credentials, {
        name: senderName,
        tags: {
          phone: channelId,
          source: 'whatsapp',
        },
      });

      // Create conversation in Botpress
      const convResponse = await this.clientService.createConversation(
        config.botId,
        credentials,
        userResponse.user.id,
        {
          channel: 'whatsapp',
          tags: {
            saddahConversationId: conversationId,
            phone: channelId,
          },
        },
      );

      // Create mapping in Saddah
      const mapping = await this.prisma.botpressConversation.create({
        data: {
          tenantId,
          conversationId,
          botpressConvId: convResponse.conversation.id,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(
        `Created Botpress conversation ${convResponse.conversation.id} for Saddah conversation ${conversationId}`,
      );

      return mapping as BotpressConversationRecord;
    } catch (error: any) {
      this.logger.error(
        `Failed to create Botpress conversation: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get Botpress conversation mapping
   */
  async getConversationMapping(
    tenantId: string,
    conversationId: string,
  ): Promise<BotpressConversationRecord | null> {
    const mapping = await this.prisma.botpressConversation.findUnique({
      where: {
        tenantId_conversationId: {
          tenantId,
          conversationId,
        },
      },
    });

    return mapping as BotpressConversationRecord | null;
  }

  /**
   * Get mapping by Botpress conversation ID
   */
  async getByBotpressConvId(
    tenantId: string,
    botpressConvId: string,
  ): Promise<BotpressConversationRecord | null> {
    const mapping = await this.prisma.botpressConversation.findFirst({
      where: {
        tenantId,
        botpressConvId,
      },
    });

    return mapping as BotpressConversationRecord | null;
  }

  /**
   * Update qualification data from Botpress state
   */
  async updateQualificationData(
    id: string,
    data: Record<string, any>,
    score: number,
    state?: string,
  ): Promise<void> {
    await this.prisma.botpressConversation.update({
      where: { id },
      data: {
        qualificationData: data,
        qualificationScore: score,
        botpressState: state,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Update last synced timestamp
   */
  async updateLastSynced(id: string): Promise<void> {
    await this.prisma.botpressConversation.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });
  }

  /**
   * Update Botpress state
   */
  async updateState(id: string, state: string): Promise<void> {
    await this.prisma.botpressConversation.update({
      where: { id },
      data: {
        botpressState: state,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * List all Botpress conversations for a tenant
   */
  async listConversations(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      state?: string;
    },
  ): Promise<{ data: BotpressConversationRecord[]; total: number }> {
    const where: any = { tenantId };

    if (options?.state) {
      where.botpressState = options.state;
    }

    const [data, total] = await Promise.all([
      this.prisma.botpressConversation.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 50,
        orderBy: { lastSyncedAt: 'desc' },
      }),
      this.prisma.botpressConversation.count({ where }),
    ]);

    return {
      data: data as BotpressConversationRecord[],
      total,
    };
  }

  /**
   * Sync conversation state from Botpress
   */
  async syncConversationState(tenantId: string, conversationId: string): Promise<void> {
    const mapping = await this.getConversationMapping(tenantId, conversationId);
    if (!mapping) {
      return;
    }

    const configData = await this.configService.getConfigWithCredentials(tenantId);
    if (!configData) {
      return;
    }

    const { config, credentials } = configData;

    try {
      const state = await this.clientService.getConversationState(
        config.botId,
        credentials,
        mapping.botpressConvId,
      );

      if (state) {
        await this.prisma.botpressConversation.update({
          where: { id: mapping.id },
          data: {
            botpressState: JSON.stringify(state.state),
            lastSyncedAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync conversation state: ${error.message}`);
    }
  }
}
