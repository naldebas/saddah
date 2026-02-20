/**
 * LLM Service
 * SADDAH CRM AI Module
 *
 * Provides OpenAI GPT integration with:
 * - GPT-4 Turbo as primary model
 * - GPT-3.5 Turbo as fallback
 * - Error handling and retry logic
 * - Token usage tracking
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  DEFAULT_LLM_CONFIG,
  LlmConfig,
  LlmResponse,
  TokenUsage,
  ChatMessage,
  MODEL_TOKEN_LIMITS,
} from './llm.config';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private client: OpenAI;
  private config: LlmConfig;
  private tokenUsageHistory: TokenUsage[] = [];

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
  }

  onModuleInit() {
    this.initializeClient();
  }

  /**
   * Load configuration from environment
   */
  private loadConfig(): LlmConfig {
    return {
      apiKey: this.configService.get<string>('OPENAI_API_KEY', ''),
      primaryModel: this.configService.get<string>(
        'OPENAI_MODEL',
        DEFAULT_LLM_CONFIG.primaryModel!,
      ),
      fallbackModel: this.configService.get<string>(
        'OPENAI_FALLBACK_MODEL',
        DEFAULT_LLM_CONFIG.fallbackModel!,
      ),
      maxTokens: this.configService.get<number>(
        'OPENAI_MAX_TOKENS',
        DEFAULT_LLM_CONFIG.maxTokens!,
      ),
      temperature: this.configService.get<number>(
        'OPENAI_TEMPERATURE',
        DEFAULT_LLM_CONFIG.temperature!,
      ),
      timeout: this.configService.get<number>(
        'OPENAI_TIMEOUT',
        DEFAULT_LLM_CONFIG.timeout!,
      ),
      maxRetries: DEFAULT_LLM_CONFIG.maxRetries!,
      retryDelay: DEFAULT_LLM_CONFIG.retryDelay!,
    };
  }

  /**
   * Initialize OpenAI client
   */
  private initializeClient(): void {
    if (!this.config.apiKey) {
      this.logger.warn(
        'OpenAI API key not configured. LLM features will be disabled.',
      );
      return;
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    this.logger.log(
      `LLM Service initialized with primary model: ${this.config.primaryModel}`,
    );
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return !!this.client && !!this.config.apiKey;
  }

  /**
   * Generate a chat completion
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      useFallback?: boolean;
    },
  ): Promise<LlmResponse> {
    if (!this.isAvailable()) {
      throw new Error('LLM Service is not available. Check API key configuration.');
    }

    const model = options?.model || this.config.primaryModel;
    const temperature = options?.temperature ?? this.config.temperature;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;

    try {
      return await this.callWithRetry(messages, model, temperature, maxTokens);
    } catch (error) {
      // Try fallback model if primary fails and not already using fallback
      if (
        !options?.useFallback &&
        model === this.config.primaryModel &&
        this.config.fallbackModel
      ) {
        this.logger.warn(
          `Primary model ${model} failed, trying fallback ${this.config.fallbackModel}`,
        );
        return this.chat(messages, {
          ...options,
          model: this.config.fallbackModel,
          useFallback: true,
        });
      }
      throw error;
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callWithRetry(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    attempt = 1,
  ): Promise<LlmResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      const choice = response.choices[0];
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        model,
        timestamp: new Date(),
      };

      // Track usage
      this.trackTokenUsage(usage);

      return {
        content: choice.message?.content || '',
        finishReason: choice.finish_reason || 'unknown',
        usage,
      };
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Retry attempt ${attempt}/${this.config.maxRetries} after ${delay}ms`,
        );
        await this.sleep(delay);
        return this.callWithRetry(messages, model, temperature, maxTokens, attempt + 1);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Determine if we should retry the request
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    // Retry on rate limits and server errors
    const status = error?.status || error?.response?.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any): Error {
    const status = error?.status || error?.response?.status;

    if (status === 401) {
      this.logger.error('Invalid OpenAI API key');
      return new Error('Invalid API key');
    }

    if (status === 429) {
      this.logger.error('OpenAI rate limit exceeded');
      return new Error('Rate limit exceeded. Please try again later.');
    }

    if (status === 400) {
      this.logger.error('Invalid request to OpenAI', error.message);
      return new Error('Invalid request: ' + (error.message || 'Unknown error'));
    }

    this.logger.error('OpenAI API error', error);
    return new Error('AI service temporarily unavailable');
  }

  /**
   * Track token usage
   */
  private trackTokenUsage(usage: TokenUsage): void {
    this.tokenUsageHistory.push(usage);

    // Keep only last 1000 entries
    if (this.tokenUsageHistory.length > 1000) {
      this.tokenUsageHistory = this.tokenUsageHistory.slice(-1000);
    }

    this.logger.debug(
      `Token usage: ${usage.totalTokens} tokens (prompt: ${usage.promptTokens}, completion: ${usage.completionTokens})`,
    );
  }

  /**
   * Get token usage statistics
   */
  getTokenUsageStats(): {
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    requestCount: number;
    averageTokensPerRequest: number;
  } {
    const totalTokens = this.tokenUsageHistory.reduce(
      (sum, u) => sum + u.totalTokens,
      0,
    );
    const totalPromptTokens = this.tokenUsageHistory.reduce(
      (sum, u) => sum + u.promptTokens,
      0,
    );
    const totalCompletionTokens = this.tokenUsageHistory.reduce(
      (sum, u) => sum + u.completionTokens,
      0,
    );

    return {
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      requestCount: this.tokenUsageHistory.length,
      averageTokensPerRequest:
        this.tokenUsageHistory.length > 0
          ? Math.round(totalTokens / this.tokenUsageHistory.length)
          : 0,
    };
  }

  /**
   * Estimate token count for a string (rough estimation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English, ~2 for Arabic
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const otherChars = text.length - arabicChars;
    return Math.ceil(arabicChars / 2 + otherChars / 4);
  }

  /**
   * Get maximum context window for a model
   */
  getModelContextLimit(model?: string): number {
    const modelName = model || this.config.primaryModel;
    return MODEL_TOKEN_LIMITS[modelName] || 8192;
  }

  /**
   * Helper to sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simple completion for single prompts
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chat(messages);
    return response.content;
  }
}
