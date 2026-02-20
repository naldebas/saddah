/**
 * Context Service
 * SADDAH CRM AI Module
 *
 * Manages conversation context for AI responses
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessage } from '../llm.config';
import { QualificationData } from '../state-machine/states';
import {
  ContextConfig,
  DEFAULT_CONTEXT_CONFIG,
  StoredMessage,
  UserProfile,
  BuiltContext,
  buildFullContext,
  estimateTokens,
  summarizeConversation,
} from './context-builder';
import { buildSystemPrompt } from '../prompts/system-prompt';
import { buildMessageContext } from '../prompts/state-prompts';

/**
 * Context service configuration
 */
export interface ContextServiceConfig extends ContextConfig {
  maxConversationLength: number;
  summaryThreshold: number;
}

/**
 * Context build options
 */
export interface BuildContextOptions {
  conversationId: string;
  messages: StoredMessage[];
  qualificationData?: QualificationData;
  userProfile?: UserProfile;
  currentState?: string;
  customInstructions?: string;
}

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  private config: ContextServiceConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration
   */
  private loadConfig(): ContextServiceConfig {
    return {
      ...DEFAULT_CONTEXT_CONFIG,
      maxTokens: this.configService.get<number>('CONTEXT_MAX_TOKENS', 4000),
      reserveForResponse: this.configService.get<number>(
        'CONTEXT_RESERVE_TOKENS',
        500,
      ),
      maxConversationLength: this.configService.get<number>(
        'MAX_CONVERSATION_LENGTH',
        100,
      ),
      summaryThreshold: this.configService.get<number>('SUMMARY_THRESHOLD', 20),
    };
  }

  /**
   * Build context for a conversation
   */
  buildContext(options: BuildContextOptions): BuiltContext {
    const {
      messages,
      qualificationData,
      userProfile,
      currentState,
      customInstructions,
    } = options;

    // Build system prompt
    let systemPrompt = buildSystemPrompt({
      compact: messages.length > this.config.summaryThreshold,
      role: 'qualification',
      includePoliteness: true,
      customInstructions,
    });

    // Add state-specific context
    if (currentState && qualificationData) {
      systemPrompt += '\n\n' + buildMessageContext(
        currentState as any,
        qualificationData,
      );
    }

    const context = buildFullContext({
      systemPrompt,
      messages,
      qualificationData,
      userProfile,
      config: this.config,
    });

    this.logger.debug(
      `Built context for conversation ${options.conversationId}: ${context.totalTokens} tokens, truncated: ${context.truncated}`,
    );

    return context;
  }

  /**
   * Build minimal context for quick responses
   */
  buildMinimalContext(
    recentMessages: StoredMessage[],
    qualificationData?: QualificationData,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Minimal system prompt
    messages.push({
      role: 'system',
      content: buildSystemPrompt({ compact: true }),
    });

    // Add qualification context if available
    if (qualificationData) {
      const qualContext = buildMessageContext(
        qualificationData.state as any,
        qualificationData,
      );
      messages.push({
        role: 'system',
        content: qualContext,
      });
    }

    // Add last 5 messages
    const lastMessages = recentMessages.slice(-5);
    for (const msg of lastMessages) {
      messages.push({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Estimate if context needs summarization
   */
  needsSummarization(messages: StoredMessage[]): boolean {
    return messages.length > this.config.summaryThreshold;
  }

  /**
   * Generate a summary of the conversation
   */
  generateSummary(messages: StoredMessage[]): string {
    const chatMessages = messages.map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content,
    })) as ChatMessage[];

    return summarizeConversation(chatMessages);
  }

  /**
   * Calculate token usage for messages
   */
  calculateTokenUsage(messages: ChatMessage[]): number {
    return messages.reduce(
      (total, msg) => total + estimateTokens(msg.content),
      0,
    );
  }

  /**
   * Check if context fits within limit
   */
  fitsWithinLimit(messages: ChatMessage[]): boolean {
    const tokens = this.calculateTokenUsage(messages);
    return tokens <= this.config.maxTokens - this.config.reserveForResponse;
  }

  /**
   * Add a new message to context and rebalance
   */
  addMessageToContext(
    context: ChatMessage[],
    newMessage: ChatMessage,
  ): ChatMessage[] {
    const updated = [...context, newMessage];
    const tokens = this.calculateTokenUsage(updated);

    if (tokens <= this.config.maxTokens - this.config.reserveForResponse) {
      return updated;
    }

    // Need to trim older messages
    const systemMessages = updated.filter((m) => m.role === 'system');
    const conversationMessages = updated.filter((m) => m.role !== 'system');

    // Keep system messages and trim conversation from the beginning
    const trimmedConversation: ChatMessage[] = [];
    let usedTokens = systemMessages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
    const availableTokens =
      this.config.maxTokens - this.config.reserveForResponse;

    // Add messages from end (most recent)
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(conversationMessages[i].content);
      if (usedTokens + msgTokens <= availableTokens) {
        trimmedConversation.unshift(conversationMessages[i]);
        usedTokens += msgTokens;
      } else {
        break;
      }
    }

    return [...systemMessages, ...trimmedConversation];
  }

  /**
   * Get context statistics
   */
  getContextStats(context: ChatMessage[]): {
    totalTokens: number;
    systemTokens: number;
    conversationTokens: number;
    messageCount: number;
    capacityUsed: number;
  } {
    const systemMessages = context.filter((m) => m.role === 'system');
    const conversationMessages = context.filter((m) => m.role !== 'system');

    const systemTokens = systemMessages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
    const conversationTokens = conversationMessages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
    const totalTokens = systemTokens + conversationTokens;

    return {
      totalTokens,
      systemTokens,
      conversationTokens,
      messageCount: context.length,
      capacityUsed: totalTokens / this.config.maxTokens,
    };
  }

  /**
   * Prepare context for API call
   */
  prepareForApiCall(
    messages: StoredMessage[],
    qualificationData?: QualificationData,
    userProfile?: UserProfile,
  ): {
    messages: ChatMessage[];
    stats: ReturnType<typeof this.getContextStats>;
  } {
    const context = this.buildContext({
      conversationId: 'api-call',
      messages,
      qualificationData,
      userProfile,
    });

    return {
      messages: context.messages,
      stats: this.getContextStats(context.messages),
    };
  }
}
