import { api } from './api';

// ============ Tenant Settings Types ============

export interface BusinessHours {
  start: string; // HH:MM format, e.g., "09:00"
  end: string;   // HH:MM format, e.g., "17:00"
  workDays: string[]; // e.g., ["sunday", "monday", "tuesday", ...]
}

export interface Branding {
  logo?: string;
  favicon?: string;
  primaryColor?: string;  // hex, e.g., "#0D9488"
  secondaryColor?: string; // hex, e.g., "#F59E0B"
}

export interface TenantSettings {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  businessHours?: BusinessHours;
  branding?: Branding;
  timezone?: string;
  defaultLanguage?: string;
  currency?: string;
  dateFormat?: string;
}

export interface TenantSettingsResponse {
  id: string;
  name: string;
  domain?: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantSettingsDto {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  businessHours?: BusinessHours;
  branding?: Branding;
  timezone?: string;
  defaultLanguage?: string;
  currency?: string;
  dateFormat?: string;
}

// ============ Notification Preferences Types ============

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  dealUpdates: boolean;
  newLeads: boolean;
  activityReminders: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  conversationAssignments: boolean;
}

export interface UpdateNotificationPreferencesDto {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  dealUpdates?: boolean;
  newLeads?: boolean;
  activityReminders?: boolean;
  dailyDigest?: boolean;
  weeklyReport?: boolean;
  conversationAssignments?: boolean;
}

// ============ User Preferences Types ============

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  accentColor: string;
  tableViewDensity: string;
  defaultDealView: string;
  defaultPageSize: number;
  showWelcomeScreen: boolean;
}

export interface UpdateUserPreferencesDto {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  accentColor?: string;
  tableViewDensity?: string;
  defaultDealView?: string;
  defaultPageSize?: number;
  showWelcomeScreen?: boolean;
}

// ============ Plan Info Types ============

export interface PlanUsage {
  users: number;
  contacts: number;
  deals: number;
}

export interface PlanLimits {
  users: number | string;    // Can be "غير محدود" for unlimited
  contacts: number | string;
  deals: number | string;
}

export interface PlanInfo {
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  trialStartDate: string;
  trialEndDate: string | null;
  usage: PlanUsage;
  limits: PlanLimits;
}

// ============ WhatsApp Config Types ============

export type WhatsAppProvider = 'twilio' | 'meta';

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export interface MetaCredentials {
  token: string;
  phoneNumberId: string;
  businessAccountId: string;
  appSecret?: string;
}

export interface WhatsAppConfig {
  id: string;
  tenantId: string;
  provider: WhatsAppProvider;
  phoneNumber: string;
  isActive: boolean;
  isVerified: boolean;
  webhookUrl: string;
  webhookSecret?: string;
  lastTestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  maskedCredentials?: Record<string, string>;
}

export interface WhatsAppConfigResponse {
  configured: boolean;
  config?: WhatsAppConfig;
}

export interface UpdateWhatsAppConfigDto {
  provider: WhatsAppProvider;
  phoneNumber: string;
  twilioCredentials?: TwilioCredentials;
  metaCredentials?: MetaCredentials;
  isActive?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
  testedAt: string;
}

export interface RotateSecretResponse {
  webhookSecret: string;
  message: string;
}

// ============ Settings API ============

export const settingsApi = {
  // Tenant Settings
  getTenantSettings: async (): Promise<TenantSettingsResponse> => {
    const response = await api.get('/settings/tenant');
    return response.data;
  },

  updateTenantSettings: async (data: UpdateTenantSettingsDto): Promise<TenantSettingsResponse> => {
    const response = await api.patch('/settings/tenant', data);
    return response.data;
  },

  // Notification Preferences
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/settings/notifications');
    return response.data;
  },

  updateNotificationPreferences: async (data: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> => {
    const response = await api.patch('/settings/notifications', data);
    return response.data;
  },

  // User Preferences
  getUserPreferences: async (): Promise<UserPreferences> => {
    const response = await api.get('/settings/preferences');
    return response.data;
  },

  updateUserPreferences: async (data: UpdateUserPreferencesDto): Promise<UserPreferences> => {
    const response = await api.patch('/settings/preferences', data);
    return response.data;
  },

  // Plan Info
  getPlanInfo: async (): Promise<PlanInfo> => {
    const response = await api.get('/settings/plan');
    return response.data;
  },

  // WhatsApp Config
  getWhatsAppConfig: async (): Promise<WhatsAppConfigResponse> => {
    const response = await api.get('/settings/whatsapp');
    // Backend returns { configured: false } if not configured
    // or the full config object if configured
    if (response.data.configured === false) {
      return { configured: false };
    }
    return { configured: true, config: response.data };
  },

  updateWhatsAppConfig: async (data: UpdateWhatsAppConfigDto): Promise<WhatsAppConfig> => {
    const response = await api.put('/settings/whatsapp', data);
    return response.data;
  },

  testWhatsAppConnection: async (): Promise<TestConnectionResult> => {
    const response = await api.post('/settings/whatsapp/test');
    return response.data;
  },

  rotateWhatsAppSecret: async (): Promise<RotateSecretResponse> => {
    const response = await api.post('/settings/whatsapp/rotate-secret');
    return response.data;
  },

  activateWhatsApp: async (): Promise<WhatsAppConfig> => {
    const response = await api.post('/settings/whatsapp/activate');
    return response.data;
  },

  deactivateWhatsApp: async (): Promise<WhatsAppConfig> => {
    const response = await api.post('/settings/whatsapp/deactivate');
    return response.data;
  },

  deleteWhatsAppConfig: async (): Promise<void> => {
    await api.delete('/settings/whatsapp');
  },
};
