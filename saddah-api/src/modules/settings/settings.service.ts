// src/modules/settings/settings.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { UpdateUserPreferencesDto, ThemePreference } from './dto/user-preferences.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // TENANT SETTINGS
  // ============================================

  async getTenantSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenantSettings(tenantId: string, userRole: string, dto: UpdateTenantSettingsDto) {
    // Only admins can update tenant settings
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can update tenant settings');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Merge new settings with existing settings
    const currentSettings = (tenant.settings || {}) as Prisma.JsonObject;
    const newSettings: Prisma.JsonObject = {};

    // Copy current settings
    for (const [key, value] of Object.entries(currentSettings)) {
      newSettings[key] = value;
    }

    // Apply updates
    if (dto.companyName !== undefined) newSettings.companyName = dto.companyName;
    if (dto.companyEmail !== undefined) newSettings.companyEmail = dto.companyEmail;
    if (dto.companyPhone !== undefined) newSettings.companyPhone = dto.companyPhone;
    if (dto.companyAddress !== undefined) newSettings.companyAddress = dto.companyAddress;
    if (dto.companyWebsite !== undefined) newSettings.companyWebsite = dto.companyWebsite;
    if (dto.businessHours !== undefined) {
      newSettings.businessHours = {
        start: dto.businessHours.start,
        end: dto.businessHours.end,
        workDays: dto.businessHours.workDays,
      };
    }
    if (dto.branding !== undefined) {
      newSettings.branding = {
        logo: dto.branding.logo || null,
        favicon: dto.branding.favicon || null,
        primaryColor: dto.branding.primaryColor || null,
        secondaryColor: dto.branding.secondaryColor || null,
      };
    }
    if (dto.timezone !== undefined) newSettings.timezone = dto.timezone;
    if (dto.defaultLanguage !== undefined) newSettings.defaultLanguage = dto.defaultLanguage;
    if (dto.currency !== undefined) newSettings.currency = dto.currency;
    if (dto.dateFormat !== undefined) newSettings.dateFormat = dto.dateFormat;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: newSettings,
        name: dto.companyName || tenant.name,
      },
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  async getNotificationPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get preferences from user's settings or return defaults
    const defaultPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      dealUpdates: true,
      newLeads: true,
      activityReminders: true,
      dailyDigest: false,
      weeklyReport: true,
      conversationAssignments: true,
    };

    // In a real app, you'd store these in a separate table or JSON field
    // For now, we'll return defaults
    return defaultPreferences;
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // In production, you'd save to a user_preferences table or JSON field
    // For now, we'll just return the merged preferences
    const currentPreferences = await this.getNotificationPreferences(userId);
    const updatedPreferences = {
      ...currentPreferences,
      ...dto,
    };

    return updatedPreferences;
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  async getUserPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Default preferences
    return {
      theme: ThemePreference.LIGHT,
      language: user.language || 'ar',
      accentColor: '#0D9488',
      tableViewDensity: 'normal',
      defaultDealView: 'kanban',
      defaultPageSize: 20,
      showWelcomeScreen: true,
    };
  }

  async updateUserPreferences(userId: string, dto: UpdateUserPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update language if provided
    if (dto.language) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { language: dto.language },
      });
    }

    // Return merged preferences
    const currentPreferences = await this.getUserPreferences(userId);
    return {
      ...currentPreferences,
      ...dto,
    };
  }

  // ============================================
  // PLAN INFO
  // ============================================

  async getPlanInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            contacts: true,
            deals: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const planLimits: Record<string, { users: number; contacts: number; deals: number }> = {
      trial: { users: 3, contacts: 100, deals: 50 },
      starter: { users: 5, contacts: 1000, deals: 500 },
      professional: { users: 20, contacts: 10000, deals: 5000 },
      enterprise: { users: -1, contacts: -1, deals: -1 }, // unlimited
    };

    const limits = planLimits[tenant.plan] || planLimits.trial;

    return {
      plan: tenant.plan,
      trialStartDate: tenant.createdAt,
      trialEndDate: tenant.plan === 'trial'
        ? new Date(tenant.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
        : null,
      usage: {
        users: tenant._count.users,
        contacts: tenant._count.contacts,
        deals: tenant._count.deals,
      },
      limits: {
        users: limits.users === -1 ? 'غير محدود' : limits.users,
        contacts: limits.contacts === -1 ? 'غير محدود' : limits.contacts,
        deals: limits.deals === -1 ? 'غير محدود' : limits.deals,
      },
    };
  }
}
