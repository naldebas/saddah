/**
 * Context Builder
 * SADDAH CRM AI Module
 *
 * Builds conversation context from messages and user data
 */

import { ChatMessage, MODEL_TOKEN_LIMITS } from '../llm.config';
import { QualificationData } from '../state-machine/states';

/**
 * Context configuration
 */
export interface ContextConfig {
  maxTokens: number;
  reserveForResponse: number;
  includeSystemPrompt: boolean;
  includeUserProfile: boolean;
  includeSummary: boolean;
}

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 4000,
  reserveForResponse: 500,
  includeSystemPrompt: true,
  includeUserProfile: true,
  includeSummary: true,
};

/**
 * Message from database
 */
export interface StoredMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  content: string;
  type: string;
  createdAt: Date;
}

/**
 * User profile data for context
 */
export interface UserProfile {
  name?: string;
  phone?: string;
  email?: string;
  previousInteractions?: number;
  lastContactDate?: Date;
  tags?: string[];
}

/**
 * Built context result
 */
export interface BuiltContext {
  messages: ChatMessage[];
  totalTokens: number;
  truncated: boolean;
  summaryIncluded: boolean;
}

/**
 * Estimate token count for text
 * Rough estimation: ~4 chars per token for English, ~2 for Arabic
 */
export function estimateTokens(text: string): number {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + otherChars / 4);
}

/**
 * Convert stored messages to chat messages
 */
export function storedToChatMessages(messages: StoredMessage[]): ChatMessage[] {
  return messages.map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content,
  })) as ChatMessage[];
}

/**
 * Build user profile context
 */
export function buildUserProfileContext(profile: UserProfile): string {
  const lines: string[] = [];

  if (profile.name) {
    lines.push(`اسم العميل: ${profile.name}`);
  }

  if (profile.previousInteractions) {
    lines.push(`عدد المحادثات السابقة: ${profile.previousInteractions}`);
  }

  if (profile.lastContactDate) {
    const daysSince = Math.floor(
      (Date.now() - profile.lastContactDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince === 0) {
      lines.push('آخر تواصل: اليوم');
    } else if (daysSince === 1) {
      lines.push('آخر تواصل: أمس');
    } else {
      lines.push(`آخر تواصل: منذ ${daysSince} أيام`);
    }
  }

  if (profile.tags && profile.tags.length > 0) {
    lines.push(`التصنيفات: ${profile.tags.join(', ')}`);
  }

  return lines.length > 0 ? `## معلومات العميل:\n${lines.join('\n')}` : '';
}

/**
 * Build qualification data context
 */
export function buildQualificationContext(data: QualificationData): string {
  const lines: string[] = [];

  if (data.name) lines.push(`الاسم: ${data.name}`);
  if (data.propertyType) lines.push(`نوع العقار: ${data.propertyType}`);
  if (data.location?.city) lines.push(`المدينة: ${data.location.city}`);
  if (data.location?.district) lines.push(`الحي: ${data.location.district}`);
  if (data.budget?.max) {
    const formatted =
      data.budget.max >= 1000000
        ? `${(data.budget.max / 1000000).toFixed(1)} مليون`
        : `${data.budget.max.toLocaleString()} ريال`;
    lines.push(`الميزانية: ${formatted}`);
  }
  if (data.timeline) lines.push(`التوقيت: ${data.timeline}`);
  if (data.financingNeeded !== undefined) {
    lines.push(`التمويل: ${data.financingNeeded ? 'يحتاج' : 'لا يحتاج'}`);
  }
  if (data.isUrgent) lines.push('ملاحظة: العميل مستعجل');

  return lines.length > 0
    ? `## المعلومات المجموعة:\n${lines.join('\n')}`
    : '';
}

/**
 * Summarize conversation history
 */
export function summarizeConversation(messages: ChatMessage[]): string {
  if (messages.length === 0) return '';

  const topics: string[] = [];
  let userAsked = false;
  let appointmentMentioned = false;

  for (const msg of messages) {
    const content = msg.content.toLowerCase();

    // Check for topics discussed
    if (content.includes('فيلا') || content.includes('شقة')) {
      topics.push('نوع العقار');
    }
    if (
      content.includes('رياض') ||
      content.includes('جدة') ||
      content.includes('حي')
    ) {
      topics.push('الموقع');
    }
    if (
      content.includes('مليون') ||
      content.includes('ميزانية') ||
      content.includes('سعر')
    ) {
      topics.push('الميزانية');
    }
    if (content.includes('تمويل')) {
      topics.push('التمويل');
    }
    if (content.includes('موعد')) {
      appointmentMentioned = true;
    }
    if (msg.role === 'user') {
      userAsked = true;
    }
  }

  const uniqueTopics = [...new Set(topics)];
  let summary = `تمت مناقشة: ${uniqueTopics.join('، ') || 'موضوع عام'}`;

  if (appointmentMentioned) {
    summary += '\nتم ذكر موضوع الموعد';
  }

  return summary;
}

/**
 * Truncate messages to fit token limit
 */
export function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number,
  keepLast: number = 10,
): { messages: ChatMessage[]; truncated: boolean } {
  let totalTokens = 0;
  const result: ChatMessage[] = [];

  // Always keep the last N messages
  const lastMessages = messages.slice(-keepLast);
  const earlierMessages = messages.slice(0, -keepLast);

  // Calculate tokens for last messages (must include)
  for (const msg of lastMessages) {
    totalTokens += estimateTokens(msg.content);
  }

  // If last messages exceed limit, we have to include them anyway
  if (totalTokens > maxTokens) {
    return { messages: lastMessages, truncated: true };
  }

  // Add earlier messages from newest to oldest until limit
  const remainingTokens = maxTokens - totalTokens;
  let usedTokens = 0;
  const includedEarlier: ChatMessage[] = [];

  for (let i = earlierMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(earlierMessages[i].content);
    if (usedTokens + msgTokens <= remainingTokens) {
      includedEarlier.unshift(earlierMessages[i]);
      usedTokens += msgTokens;
    } else {
      break;
    }
  }

  const truncated = includedEarlier.length < earlierMessages.length;

  return {
    messages: [...includedEarlier, ...lastMessages],
    truncated,
  };
}

/**
 * Build full context for LLM
 */
export function buildFullContext(options: {
  systemPrompt: string;
  messages: StoredMessage[];
  qualificationData?: QualificationData;
  userProfile?: UserProfile;
  config?: Partial<ContextConfig>;
}): BuiltContext {
  const config = { ...DEFAULT_CONTEXT_CONFIG, ...options.config };
  const availableTokens = config.maxTokens - config.reserveForResponse;

  let totalTokens = 0;
  const resultMessages: ChatMessage[] = [];

  // Add system prompt
  if (config.includeSystemPrompt) {
    const systemTokens = estimateTokens(options.systemPrompt);
    totalTokens += systemTokens;
    resultMessages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  // Add user profile context
  if (config.includeUserProfile && options.userProfile) {
    const profileContext = buildUserProfileContext(options.userProfile);
    if (profileContext) {
      const profileTokens = estimateTokens(profileContext);
      if (totalTokens + profileTokens < availableTokens * 0.3) {
        resultMessages.push({
          role: 'system',
          content: profileContext,
        });
        totalTokens += profileTokens;
      }
    }
  }

  // Add qualification data context
  if (options.qualificationData) {
    const qualContext = buildQualificationContext(options.qualificationData);
    if (qualContext) {
      const qualTokens = estimateTokens(qualContext);
      if (totalTokens + qualTokens < availableTokens * 0.3) {
        resultMessages.push({
          role: 'system',
          content: qualContext,
        });
        totalTokens += qualTokens;
      }
    }
  }

  // Convert and add conversation messages
  const chatMessages = storedToChatMessages(options.messages);
  const remainingTokens = availableTokens - totalTokens;

  const { messages: truncatedMessages, truncated } = truncateMessages(
    chatMessages,
    remainingTokens,
  );

  // If truncated and config allows, add summary
  let summaryIncluded = false;
  if (truncated && config.includeSummary) {
    const summary = summarizeConversation(chatMessages);
    const summaryMessage: ChatMessage = {
      role: 'system',
      content: `## ملخص المحادثة السابقة:\n${summary}`,
    };
    resultMessages.push(summaryMessage);
    totalTokens += estimateTokens(summary);
    summaryIncluded = true;
  }

  // Add the conversation messages
  for (const msg of truncatedMessages) {
    resultMessages.push(msg);
    totalTokens += estimateTokens(msg.content);
  }

  return {
    messages: resultMessages,
    totalTokens,
    truncated,
    summaryIncluded,
  };
}
