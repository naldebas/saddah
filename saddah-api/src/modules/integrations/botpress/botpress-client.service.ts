// src/modules/integrations/botpress/botpress-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BotpressCredentials,
  BotpressTestConnectionResult,
  BotpressSendMessagePayload,
  BotpressSendMessageResponse,
  BotpressCreateConversationPayload,
  BotpressCreateConversationResponse,
  BotpressCreateUserPayload,
  BotpressCreateUserResponse,
  BotpressConversationState,
  BotpressMessage,
} from './interfaces';

@Injectable()
export class BotpressClientService {
  private readonly logger = new Logger(BotpressClientService.name);
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService.get<string>(
      'BOTPRESS_API_BASE_URL',
      'https://api.botpress.cloud/v1',
    );
  }

  /**
   * Test connection to Botpress Cloud
   */
  async testConnection(
    botId: string,
    workspaceId: string,
    credentials: BotpressCredentials,
  ): Promise<BotpressTestConnectionResult> {
    try {
      // Test by fetching bot info
      const response = await this.makeRequest(
        'GET',
        `/bots/${botId}`,
        credentials.token,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect to Botpress');
      }

      const botData = await response.json();

      // Also verify workspace
      const wsResponse = await this.makeRequest(
        'GET',
        `/workspaces/${workspaceId}`,
        credentials.token,
      );

      let workspaceName = workspaceId;
      if (wsResponse.ok) {
        const wsData = await wsResponse.json();
        workspaceName = wsData.name || workspaceId;
      }

      return {
        success: true,
        botId: botData.id || botId,
        botName: botData.name || 'Unknown Bot',
        workspaceId,
        workspaceName,
      };
    } catch (error: any) {
      this.logger.error('Botpress connection test failed', error);
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Send a message to Botpress
   */
  async sendMessage(
    botId: string,
    credentials: BotpressCredentials,
    conversationId: string,
    userId: string,
    message: BotpressMessage,
    tags?: Record<string, string>,
  ): Promise<BotpressSendMessageResponse> {
    const payload: BotpressSendMessagePayload = {
      userId,
      conversationId,
      payload: message,
      tags,
    };

    const response = await this.makeRequest(
      'POST',
      `/bots/${botId}/conversations/${conversationId}/messages`,
      credentials.token,
      payload,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message to Botpress');
    }

    return response.json();
  }

  /**
   * Create a user in Botpress
   */
  async createUser(
    botId: string,
    credentials: BotpressCredentials,
    payload: BotpressCreateUserPayload,
  ): Promise<BotpressCreateUserResponse> {
    const response = await this.makeRequest(
      'POST',
      `/bots/${botId}/users`,
      credentials.token,
      payload,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user in Botpress');
    }

    return response.json();
  }

  /**
   * Create a conversation in Botpress
   */
  async createConversation(
    botId: string,
    credentials: BotpressCredentials,
    userId: string,
    payload: BotpressCreateConversationPayload,
  ): Promise<BotpressCreateConversationResponse> {
    const response = await this.makeRequest(
      'POST',
      `/bots/${botId}/conversations`,
      credentials.token,
      {
        ...payload,
        userId,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create conversation in Botpress');
    }

    return response.json();
  }

  /**
   * Get conversation state from Botpress
   */
  async getConversationState(
    botId: string,
    credentials: BotpressCredentials,
    conversationId: string,
  ): Promise<BotpressConversationState | null> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/bots/${botId}/conversations/${conversationId}/state`,
        credentials.token,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.message || 'Failed to get conversation state');
      }

      return response.json();
    } catch (error: any) {
      this.logger.error(`Failed to get conversation state: ${error.message}`);
      return null;
    }
  }

  /**
   * Update conversation state in Botpress
   */
  async updateConversationState(
    botId: string,
    credentials: BotpressCredentials,
    conversationId: string,
    state: Record<string, any>,
  ): Promise<void> {
    const response = await this.makeRequest(
      'PATCH',
      `/bots/${botId}/conversations/${conversationId}/state`,
      credentials.token,
      { state },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update conversation state');
    }
  }

  /**
   * Trigger handoff in Botpress (set state to indicate human takeover)
   */
  async triggerHandoff(
    botId: string,
    credentials: BotpressCredentials,
    conversationId: string,
    reason: string,
  ): Promise<void> {
    await this.updateConversationState(botId, credentials, conversationId, {
      handoffActive: true,
      handoffReason: reason,
      handoffAt: new Date().toISOString(),
    });

    this.logger.log(`Triggered handoff for Botpress conversation ${conversationId}: ${reason}`);
  }

  /**
   * Resume bot after handoff
   */
  async resumeBot(
    botId: string,
    credentials: BotpressCredentials,
    conversationId: string,
  ): Promise<void> {
    await this.updateConversationState(botId, credentials, conversationId, {
      handoffActive: false,
      handoffReason: null,
      resumedAt: new Date().toISOString(),
    });

    this.logger.log(`Resumed bot for Botpress conversation ${conversationId}`);
  }

  /**
   * Make HTTP request to Botpress API
   */
  private async makeRequest(
    method: string,
    path: string,
    token: string,
    body?: any,
  ): Promise<Response> {
    const url = `${this.apiBaseUrl}${path}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-bot-id': path.match(/\/bots\/([^/]+)/)?.[1] || '',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }
}
