/**
 * Saudi Dialect Service
 * SADDAH CRM AI Module
 *
 * Provides Saudi Arabic dialect processing including:
 * - Text normalization
 * - Intent extraction
 * - Entity extraction
 * - Pattern matching
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  isGreeting,
  isAffirmation,
  isNegation,
  isQuestion,
  isHandoffTrigger,
  URGENCY_PATTERNS,
  FINANCING_PATTERNS,
  TIMELINE_PATTERNS,
} from './patterns';
import {
  extractPropertyType,
  extractLocation,
  extractBudget,
  extractTransactionType,
} from './real-estate-terms';

/**
 * Intent types that can be extracted from user messages
 */
export enum UserIntent {
  GREETING = 'greeting',
  INQUIRY = 'inquiry',
  PROPERTY_SEARCH = 'property_search',
  PROVIDE_INFO = 'provide_info',
  AFFIRMATION = 'affirmation',
  NEGATION = 'negation',
  QUESTION = 'question',
  HANDOFF_REQUEST = 'handoff_request',
  SCHEDULE_REQUEST = 'schedule_request',
  UNKNOWN = 'unknown',
}

/**
 * Extracted entities from user message
 */
export interface ExtractedEntities {
  propertyType?: { type: string; confidence: number };
  location?: { city?: string; district?: string; region?: string };
  budget?: { min?: number; max?: number; currency: string };
  transactionType?: string;
  timeline?: string;
  financingNeeded?: boolean;
  isUrgent?: boolean;
  name?: string;
  phone?: string;
  email?: string;
}

/**
 * Analysis result from processing a message
 */
export interface DialectAnalysisResult {
  normalizedText: string;
  intent: UserIntent;
  entities: ExtractedEntities;
  confidence: number;
  requiresHandoff: boolean;
}

@Injectable()
export class SaudiDialectService {
  private readonly logger = new Logger(SaudiDialectService.name);

  /**
   * Normalize Arabic text
   * - Remove diacritics (tashkeel)
   * - Normalize hamza variations
   * - Normalize alef variations
   * - Remove tatweel
   */
  normalizeText(text: string): string {
    let normalized = text;

    // Remove Arabic diacritics (tashkeel)
    normalized = normalized.replace(/[\u064B-\u065F]/g, '');

    // Normalize alef variations to plain alef
    normalized = normalized.replace(/[إأآ]/g, 'ا');

    // Normalize alef maksura to ya
    normalized = normalized.replace(/ى/g, 'ي');

    // Remove tatweel (kashida)
    normalized = normalized.replace(/ـ/g, '');

    // Normalize ta marbuta to ha
    normalized = normalized.replace(/ة/g, 'ه');

    // Remove multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized.trim();
  }

  /**
   * Analyze a user message and extract intent and entities
   */
  analyzeMessage(text: string): DialectAnalysisResult {
    const normalizedText = this.normalizeText(text);
    const entities = this.extractEntities(text);
    const intent = this.detectIntent(text, entities);
    const requiresHandoff = isHandoffTrigger(text);

    return {
      normalizedText,
      intent,
      entities,
      confidence: this.calculateConfidence(intent, entities),
      requiresHandoff,
    };
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(
    text: string,
    entities: ExtractedEntities,
  ): UserIntent {
    // Check for explicit handoff request
    if (isHandoffTrigger(text)) {
      return UserIntent.HANDOFF_REQUEST;
    }

    // Check for greeting
    if (isGreeting(text)) {
      return UserIntent.GREETING;
    }

    // Check for affirmation
    if (isAffirmation(text)) {
      return UserIntent.AFFIRMATION;
    }

    // Check for negation
    if (isNegation(text)) {
      return UserIntent.NEGATION;
    }

    // Check for property search
    if (entities.propertyType || entities.location || entities.budget) {
      return UserIntent.PROPERTY_SEARCH;
    }

    // Check if providing information (name, phone, etc.)
    if (entities.name || entities.phone || entities.email) {
      return UserIntent.PROVIDE_INFO;
    }

    // Check if asking a question
    if (isQuestion(text)) {
      return UserIntent.QUESTION;
    }

    // Check for scheduling intent
    if (this.hasSchedulingIntent(text)) {
      return UserIntent.SCHEDULE_REQUEST;
    }

    return UserIntent.UNKNOWN;
  }

  /**
   * Extract all entities from text
   */
  private extractEntities(text: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract property type
    const propertyType = extractPropertyType(text);
    if (propertyType) {
      entities.propertyType = propertyType;
    }

    // Extract location
    const location = extractLocation(text);
    if (location) {
      entities.location = location;
    }

    // Extract budget
    const budget = extractBudget(text);
    if (budget) {
      entities.budget = budget;
    }

    // Extract transaction type
    const transactionType = extractTransactionType(text);
    if (transactionType) {
      entities.transactionType = transactionType;
    }

    // Extract timeline
    const timeline = this.extractTimeline(text);
    if (timeline) {
      entities.timeline = timeline;
    }

    // Check financing need
    entities.financingNeeded = this.checkFinancingNeed(text);

    // Check urgency
    entities.isUrgent = this.checkUrgency(text);

    // Extract contact info
    const contactInfo = this.extractContactInfo(text);
    if (contactInfo.name) entities.name = contactInfo.name;
    if (contactInfo.phone) entities.phone = contactInfo.phone;
    if (contactInfo.email) entities.email = contactInfo.email;

    return entities;
  }

  /**
   * Extract timeline from text
   */
  private extractTimeline(text: string): string | null {
    for (const [timeline, patterns] of Object.entries(TIMELINE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return timeline;
        }
      }
    }
    return null;
  }

  /**
   * Check if financing is needed
   */
  private checkFinancingNeed(text: string): boolean | undefined {
    for (const pattern of FINANCING_PATTERNS.needs_financing) {
      if (pattern.test(text)) {
        return true;
      }
    }

    for (const pattern of FINANCING_PATTERNS.cash) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return undefined;
  }

  /**
   * Check if request is urgent
   */
  private checkUrgency(text: string): boolean {
    return URGENCY_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Check for scheduling intent
   */
  private hasSchedulingIntent(text: string): boolean {
    const schedulingPatterns = [
      /موعد/,
      /زيارة/,
      /معاينة/,
      /أشوف/,
      /اشوف/,
      /نتقابل/,
      /اجتماع/,
    ];
    return schedulingPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Extract contact information from text
   */
  private extractContactInfo(text: string): {
    name?: string;
    phone?: string;
    email?: string;
  } {
    const result: { name?: string; phone?: string; email?: string } = {};

    // Extract Saudi phone number
    const phoneMatch = text.match(
      /(?:\+966|00966|05|5)[\s-]?(\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d)/,
    );
    if (phoneMatch) {
      result.phone = this.normalizePhone(phoneMatch[0]);
    }

    // Extract email
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    if (emailMatch) {
      result.email = emailMatch[0].toLowerCase();
    }

    // Extract Arabic name (simple pattern)
    const namePatterns = [
      /اسمي\s+([\u0600-\u06FF\s]+)/,
      /انا\s+([\u0600-\u06FF]+)/,
      /أنا\s+([\u0600-\u06FF]+)/,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.name = match[1].trim();
        break;
      }
    }

    return result;
  }

  /**
   * Normalize phone number to Saudi format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');

    // Handle various formats
    if (digits.startsWith('00966')) {
      digits = digits.substring(5);
    } else if (digits.startsWith('966')) {
      digits = digits.substring(3);
    } else if (digits.startsWith('05')) {
      digits = digits.substring(1);
    }

    // Ensure it starts with 5
    if (!digits.startsWith('5')) {
      digits = '5' + digits;
    }

    // Add country code
    return '+966' + digits;
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(
    intent: UserIntent,
    entities: ExtractedEntities,
  ): number {
    let confidence = 0.5;

    // Higher confidence for specific intents
    if (intent !== UserIntent.UNKNOWN) {
      confidence += 0.2;
    }

    // Add confidence based on extracted entities
    if (entities.propertyType) {
      confidence += entities.propertyType.confidence * 0.1;
    }
    if (entities.location) {
      confidence += 0.1;
    }
    if (entities.budget) {
      confidence += 0.1;
    }
    if (entities.name || entities.phone) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get keywords for prompting
   */
  extractKeywords(text: string): string[] {
    const normalizedText = this.normalizeText(text);
    const keywords: string[] = [];

    // Property type
    const propertyType = extractPropertyType(normalizedText);
    if (propertyType) {
      keywords.push(propertyType.type);
    }

    // Location
    const location = extractLocation(normalizedText);
    if (location) {
      if (location.city) keywords.push(location.city);
      if (location.district) keywords.push(location.district);
    }

    // Transaction type
    const transactionType = extractTransactionType(normalizedText);
    if (transactionType) {
      keywords.push(transactionType);
    }

    return keywords;
  }
}
