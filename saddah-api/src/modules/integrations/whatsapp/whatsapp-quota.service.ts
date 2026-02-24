// src/modules/integrations/whatsapp/whatsapp-quota.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Quota status result
 */
export interface QuotaStatus {
  daily: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    resetAt: Date;
  };
  monthly: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    resetAt: Date;
  };
  canSend: boolean;
  blockedReason?: string;
}

/**
 * Rate limit status for per-contact limiting
 */
export interface RateLimitStatus {
  allowed: boolean;
  retryAfterMs?: number;
  messagesInWindow: number;
  maxMessages: number;
}

/**
 * Events emitted by the quota service
 */
export const QuotaEvents = {
  QUOTA_WARNING_80: 'whatsapp.quota.warning_80',
  QUOTA_WARNING_90: 'whatsapp.quota.warning_90',
  QUOTA_EXCEEDED: 'whatsapp.quota.exceeded',
  QUOTA_RESET: 'whatsapp.quota.reset',
} as const;

// In-memory rate limiter for per-contact limiting
// In production, use Redis for distributed rate limiting
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class WhatsAppQuotaService {
  private readonly logger = new Logger(WhatsAppQuotaService.name);

  // Default limits
  private readonly defaultDailyLimit: number;
  private readonly defaultMonthlyLimit: number;

  // Per-contact rate limiting
  private readonly contactRateLimitWindow = 60 * 1000; // 1 minute
  private readonly contactRateLimitMax = 10; // 10 messages per minute per contact
  private readonly contactRateLimits = new Map<string, RateLimitEntry>();

  // API rate limiting (messages per second)
  private readonly apiRateLimitTwilio = 1; // 1 msg/sec for Twilio
  private readonly apiRateLimitMeta = 80; // 80 msg/sec for Meta Business API
  private lastApiCallTime = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {
    this.defaultDailyLimit = this.configService.get<number>('WHATSAPP_DAILY_LIMIT', 1000);
    this.defaultMonthlyLimit = this.configService.get<number>('WHATSAPP_MONTHLY_LIMIT', 10000);

    // Clean up rate limit entries periodically
    setInterval(() => this.cleanupRateLimits(), 60 * 1000);
  }

  // ============================================
  // QUOTA MANAGEMENT
  // ============================================

  /**
   * Get current quota status for a tenant
   */
  async getQuotaStatus(tenantId: string): Promise<QuotaStatus> {
    const today = this.getTodayDate();
    const monthYear = this.getMonthYear();

    // Get or create quota record
    const quota = await this.getOrCreateQuotaRecord(tenantId, today, monthYear);

    const dailyRemaining = Math.max(0, quota.dailyLimit - quota.dailyCount);
    const monthlyRemaining = Math.max(0, quota.monthlyLimit - quota.monthlyCount);

    const dailyPercentage = (quota.dailyCount / quota.dailyLimit) * 100;
    const monthlyPercentage = (quota.monthlyCount / quota.monthlyLimit) * 100;

    // Calculate reset times
    const dailyResetAt = new Date(today);
    dailyResetAt.setDate(dailyResetAt.getDate() + 1);
    dailyResetAt.setHours(0, 0, 0, 0);

    const monthlyResetAt = new Date(today);
    monthlyResetAt.setMonth(monthlyResetAt.getMonth() + 1);
    monthlyResetAt.setDate(1);
    monthlyResetAt.setHours(0, 0, 0, 0);

    const canSend = dailyRemaining > 0 && monthlyRemaining > 0;
    let blockedReason: string | undefined;

    if (!canSend) {
      if (dailyRemaining === 0) {
        blockedReason = 'تم تجاوز الحد اليومي للرسائل';
      } else if (monthlyRemaining === 0) {
        blockedReason = 'تم تجاوز الحد الشهري للرسائل';
      }
    }

    return {
      daily: {
        used: quota.dailyCount,
        limit: quota.dailyLimit,
        remaining: dailyRemaining,
        percentage: Math.min(100, dailyPercentage),
        resetAt: dailyResetAt,
      },
      monthly: {
        used: quota.monthlyCount,
        limit: quota.monthlyLimit,
        remaining: monthlyRemaining,
        percentage: Math.min(100, monthlyPercentage),
        resetAt: monthlyResetAt,
      },
      canSend,
      blockedReason,
    };
  }

  /**
   * Check if tenant can send messages (quick check)
   */
  async canSendMessage(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getQuotaStatus(tenantId);

    if (!status.canSend) {
      return { allowed: false, reason: status.blockedReason };
    }

    return { allowed: true };
  }

  /**
   * Increment usage count for a tenant
   */
  async incrementUsage(tenantId: string, count: number = 1): Promise<QuotaStatus> {
    const today = this.getTodayDate();
    const monthYear = this.getMonthYear();

    // Get or create quota record
    const quota = await this.getOrCreateQuotaRecord(tenantId, today, monthYear);

    // Update counts
    const updatedQuota = await this.prisma.whatsAppQuotaUsage.update({
      where: { id: quota.id },
      data: {
        dailyCount: { increment: count },
        monthlyCount: { increment: count },
      },
    });

    // Check for warnings
    await this.checkAndSendWarnings(tenantId, updatedQuota);

    return this.getQuotaStatus(tenantId);
  }

  /**
   * Set custom limits for a tenant
   */
  async setLimits(
    tenantId: string,
    dailyLimit?: number,
    monthlyLimit?: number,
  ): Promise<void> {
    const today = this.getTodayDate();
    const monthYear = this.getMonthYear();

    await this.prisma.whatsAppQuotaUsage.upsert({
      where: {
        tenantId_dailyDate: { tenantId, dailyDate: today },
      },
      create: {
        tenantId,
        dailyDate: today,
        monthYear,
        dailyLimit: dailyLimit || this.defaultDailyLimit,
        monthlyLimit: monthlyLimit || this.defaultMonthlyLimit,
      },
      update: {
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(monthlyLimit !== undefined && { monthlyLimit }),
      },
    });

    this.logger.log(
      `Updated limits for tenant ${tenantId}: daily=${dailyLimit}, monthly=${monthlyLimit}`,
    );
  }

  // ============================================
  // PER-CONTACT RATE LIMITING
  // ============================================

  /**
   * Check if we can send a message to a specific contact
   */
  checkContactRateLimit(tenantId: string, contactId: string): RateLimitStatus {
    const key = `${tenantId}:${contactId}`;
    const now = Date.now();

    let entry = this.contactRateLimits.get(key);

    // Create new entry or reset if window expired
    if (!entry || now - entry.windowStart > this.contactRateLimitWindow) {
      entry = { count: 0, windowStart: now };
      this.contactRateLimits.set(key, entry);
    }

    if (entry.count >= this.contactRateLimitMax) {
      const retryAfterMs = this.contactRateLimitWindow - (now - entry.windowStart);
      return {
        allowed: false,
        retryAfterMs,
        messagesInWindow: entry.count,
        maxMessages: this.contactRateLimitMax,
      };
    }

    return {
      allowed: true,
      messagesInWindow: entry.count,
      maxMessages: this.contactRateLimitMax,
    };
  }

  /**
   * Record a message sent to a contact
   */
  recordContactMessage(tenantId: string, contactId: string): void {
    const key = `${tenantId}:${contactId}`;
    const now = Date.now();

    let entry = this.contactRateLimits.get(key);

    if (!entry || now - entry.windowStart > this.contactRateLimitWindow) {
      entry = { count: 1, windowStart: now };
    } else {
      entry.count++;
    }

    this.contactRateLimits.set(key, entry);
  }

  // ============================================
  // API RATE LIMITING
  // ============================================

  /**
   * Wait for API rate limit if needed
   */
  async waitForApiRateLimit(provider: 'twilio' | 'meta'): Promise<void> {
    const rateLimit = provider === 'twilio' ? this.apiRateLimitTwilio : this.apiRateLimitMeta;
    const minInterval = 1000 / rateLimit; // milliseconds between messages

    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;

    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastApiCallTime = Date.now();
  }

  // ============================================
  // WARNING NOTIFICATIONS
  // ============================================

  /**
   * Check quota usage and send warnings
   */
  private async checkAndSendWarnings(tenantId: string, quota: any): Promise<void> {
    const dailyPercentage = (quota.dailyCount / quota.dailyLimit) * 100;
    const monthlyPercentage = (quota.monthlyCount / quota.monthlyLimit) * 100;

    const maxPercentage = Math.max(dailyPercentage, monthlyPercentage);
    const quotaType = dailyPercentage >= monthlyPercentage ? 'daily' : 'monthly';

    // Get admin users for notifications
    const admins = await this.prisma.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true },
    });

    if (admins.length === 0) return;

    // Check 80% warning
    if (maxPercentage >= 80 && maxPercentage < 90 && !quota.warning80Sent) {
      await this.sendQuotaWarning(tenantId, admins, 80, quotaType);
      await this.prisma.whatsAppQuotaUsage.update({
        where: { id: quota.id },
        data: { warning80Sent: true },
      });
      this.eventEmitter.emit(QuotaEvents.QUOTA_WARNING_80, { tenantId, percentage: 80 });
    }

    // Check 90% warning
    if (maxPercentage >= 90 && maxPercentage < 100 && !quota.warning90Sent) {
      await this.sendQuotaWarning(tenantId, admins, 90, quotaType);
      await this.prisma.whatsAppQuotaUsage.update({
        where: { id: quota.id },
        data: { warning90Sent: true },
      });
      this.eventEmitter.emit(QuotaEvents.QUOTA_WARNING_90, { tenantId, percentage: 90 });
    }

    // Check 100% (exceeded)
    if (maxPercentage >= 100 && !quota.warning100Sent) {
      await this.sendQuotaExceeded(tenantId, admins, quotaType);
      await this.prisma.whatsAppQuotaUsage.update({
        where: { id: quota.id },
        data: { warning100Sent: true },
      });
      this.eventEmitter.emit(QuotaEvents.QUOTA_EXCEEDED, { tenantId });
    }
  }

  /**
   * Send quota warning notification
   */
  private async sendQuotaWarning(
    tenantId: string,
    admins: { id: string }[],
    percentage: number,
    quotaType: string,
  ): Promise<void> {
    const quotaLabel = quotaType === 'daily' ? 'اليومية' : 'الشهرية';

    for (const admin of admins) {
      await this.notificationsService.create({
        tenantId,
        userId: admin.id,
        type: 'whatsapp_quota_warning',
        title: `تحذير: استخدام ${percentage}% من حصة واتساب`,
        message: `تم استخدام ${percentage}% من حصة الرسائل ${quotaLabel}. يرجى مراجعة الاستخدام أو ترقية الباقة.`,
        data: { percentage, quotaType },
      });
    }

    this.logger.warn(`Quota warning sent for tenant ${tenantId}: ${percentage}%`);
  }

  /**
   * Send quota exceeded notification
   */
  private async sendQuotaExceeded(
    tenantId: string,
    admins: { id: string }[],
    quotaType: string,
  ): Promise<void> {
    const quotaLabel = quotaType === 'daily' ? 'اليومية' : 'الشهرية';

    for (const admin of admins) {
      await this.notificationsService.create({
        tenantId,
        userId: admin.id,
        type: 'whatsapp_quota_exceeded',
        title: 'تم تجاوز حصة واتساب!',
        message: `تم تجاوز حصة الرسائل ${quotaLabel}. لن يتم إرسال رسائل جديدة حتى تجديد الحصة.`,
        data: { quotaType },
      });
    }

    this.logger.error(`Quota exceeded for tenant ${tenantId}`);
  }

  // ============================================
  // CRON JOBS
  // ============================================

  /**
   * Reset daily quotas at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyQuotas(): Promise<void> {
    this.logger.log('Resetting daily quotas...');

    const today = this.getTodayDate();
    const monthYear = this.getMonthYear();

    // Get all active tenants with WhatsApp config
    const configs = await this.prisma.whatsAppConfig.findMany({
      where: { isActive: true },
      select: { tenantId: true },
    });

    for (const config of configs) {
      // Create new daily record (or get existing for today)
      await this.getOrCreateQuotaRecord(config.tenantId, today, monthYear);
    }

    this.eventEmitter.emit(QuotaEvents.QUOTA_RESET, { type: 'daily' });
    this.logger.log(`Daily quotas reset for ${configs.length} tenants`);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get or create quota record for a tenant
   */
  private async getOrCreateQuotaRecord(
    tenantId: string,
    dailyDate: Date,
    monthYear: string,
  ) {
    let quota = await this.prisma.whatsAppQuotaUsage.findUnique({
      where: {
        tenantId_dailyDate: { tenantId, dailyDate },
      },
    });

    if (!quota) {
      // Get previous limits from last record or use defaults
      const lastRecord = await this.prisma.whatsAppQuotaUsage.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      quota = await this.prisma.whatsAppQuotaUsage.create({
        data: {
          tenantId,
          dailyDate,
          monthYear,
          dailyLimit: lastRecord?.dailyLimit || this.defaultDailyLimit,
          monthlyLimit: lastRecord?.monthlyLimit || this.defaultMonthlyLimit,
          // Carry over monthly count if same month
          monthlyCount: lastRecord?.monthYear === monthYear ? lastRecord.monthlyCount : 0,
        },
      });
    }

    return quota;
  }

  /**
   * Get today's date (normalized to start of day)
   */
  private getTodayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Get current month-year string
   */
  private getMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.contactRateLimits.entries()) {
      if (now - entry.windowStart > this.contactRateLimitWindow * 2) {
        this.contactRateLimits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get usage statistics for reporting
   */
  async getUsageStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalMessages: number;
    dailyBreakdown: { date: string; count: number }[];
  }> {
    const records = await this.prisma.whatsAppQuotaUsage.findMany({
      where: {
        tenantId,
        dailyDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { dailyDate: 'asc' },
    });

    const dailyBreakdown = records.map((r) => ({
      date: r.dailyDate.toISOString().split('T')[0],
      count: r.dailyCount,
    }));

    const totalMessages = records.reduce((sum, r) => sum + r.dailyCount, 0);

    return { totalMessages, dailyBreakdown };
  }
}
