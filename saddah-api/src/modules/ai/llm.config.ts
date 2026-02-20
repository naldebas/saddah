/**
 * LLM Configuration
 * SADDAH CRM AI Module
 */

export interface LlmConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_LLM_CONFIG: Partial<LlmConfig> = {
  primaryModel: 'gpt-4-turbo',
  fallbackModel: 'gpt-3.5-turbo',
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS = {
  GPT4_TURBO: 'gpt-4-turbo',
  GPT4: 'gpt-4',
  GPT35_TURBO: 'gpt-3.5-turbo',
  GPT35_TURBO_16K: 'gpt-3.5-turbo-16k',
} as const;

/**
 * Model token limits
 */
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
};

/**
 * Token usage tracking interface
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  timestamp: Date;
}

/**
 * LLM Response interface
 */
export interface LlmResponse {
  content: string;
  finishReason: string;
  usage: TokenUsage;
}

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message interface
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}
