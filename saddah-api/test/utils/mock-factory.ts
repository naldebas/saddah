/**
 * Mock Factory - Generate mock entities for testing
 * SADDAH CRM Test Utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MockTenant {
  id: string;
  name: string;
  domain: string | null;
  settings: Record<string, unknown>;
  plan: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUser {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  language: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tenant?: MockTenant;
}

export interface MockContact {
  id: string;
  tenantId: string;
  ownerId: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  title: string | null;
  source: string;
  tags: string[];
  customFields: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCompany {
  id: string;
  tenantId: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  size: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPipeline {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDeal {
  id: string;
  tenantId: string;
  ownerId: string;
  contactId: string | null;
  companyId: string | null;
  pipelineId: string;
  stageId: string;
  title: string;
  value: Decimal;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  closedAt: Date | null;
  status: string;
  lostReason: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockLead {
  id: string;
  tenantId: string;
  ownerId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  source: string;
  sourceId: string | null;
  status: string;
  score: number;
  scoreGrade: string | null;
  propertyType: string | null;
  budget: Decimal | null;
  timeline: string | null;
  location: string | null;
  financingNeeded: boolean | null;
  convertedAt: Date | null;
  convertedToContactId: string | null;
  convertedToDealId: string | null;
  notes: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockActivity {
  id: string;
  tenantId: string;
  createdById: string;
  contactId: string | null;
  dealId: string | null;
  type: string;
  subject: string | null;
  description: string | null;
  dueDate: Date | null;
  isCompleted: boolean;
  completedAt: Date | null;
  duration: number | null;
  outcome: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockConversation {
  id: string;
  tenantId: string;
  contactId: string | null;
  assignedToId: string | null;
  channel: string;
  channelId: string;
  status: string;
  qualificationData: Record<string, unknown>;
  lastMessageAt: Date | null;
  closedAt: Date | null;
  closedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  direction: string;
  sender: string;
  type: string;
  content: string;
  mediaUrl: string | null;
  transcription: string | null;
  duration: number | null;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

export interface MockNotification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface MockRefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a mock tenant
 */
export const createMockTenant = (overrides?: Partial<MockTenant>): MockTenant => ({
  id: uuidv4(),
  name: 'شركة سداح للعقارات',
  domain: 'saddah.io',
  settings: {},
  plan: 'professional',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock user
 */
export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  email: 'test@saddah.io',
  passwordHash: '$2b$10$hashedpassword', // bcrypt hash placeholder
  firstName: 'أحمد',
  lastName: 'السعيد',
  phone: '+966501234567',
  avatar: null,
  role: 'sales_rep',
  language: 'ar',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock user with tenant included
 */
export const createMockUserWithTenant = (
  userOverrides?: Partial<MockUser>,
  tenantOverrides?: Partial<MockTenant>,
): MockUser & { tenant: MockTenant } => {
  const tenant = createMockTenant(tenantOverrides);
  const user = createMockUser({ ...userOverrides, tenantId: tenant.id });
  return { ...user, tenant };
};

/**
 * Create a mock contact
 */
export const createMockContact = (overrides?: Partial<MockContact>): MockContact => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  ownerId: overrides?.ownerId || uuidv4(),
  companyId: null,
  firstName: 'محمد',
  lastName: 'العتيبي',
  email: 'mohammed@example.com',
  phone: '+966501234567',
  whatsapp: '+966501234567',
  title: 'مدير',
  source: 'whatsapp',
  tags: [],
  customFields: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock company
 */
export const createMockCompany = (overrides?: Partial<MockCompany>): MockCompany => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  name: 'شركة النخبة للتطوير العقاري',
  industry: 'real_estate',
  website: 'https://example.com',
  phone: '+966112345678',
  email: 'info@example.com',
  address: 'الرياض',
  city: 'الرياض',
  country: 'SA',
  size: 'medium',
  tags: [],
  customFields: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock pipeline
 */
export const createMockPipeline = (overrides?: Partial<MockPipeline>): MockPipeline => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  name: 'خط المبيعات الرئيسي',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock pipeline stage
 */
export const createMockPipelineStage = (overrides?: Partial<MockPipelineStage>): MockPipelineStage => ({
  id: uuidv4(),
  pipelineId: overrides?.pipelineId || uuidv4(),
  name: 'تأهيل',
  order: 1,
  probability: 20,
  color: '#3B82F6',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock deal
 */
export const createMockDeal = (overrides?: Partial<MockDeal>): MockDeal => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  ownerId: overrides?.ownerId || uuidv4(),
  contactId: null,
  companyId: null,
  pipelineId: overrides?.pipelineId || uuidv4(),
  stageId: overrides?.stageId || uuidv4(),
  title: 'فيلا في حي النرجس',
  value: new Decimal('2500000'),
  currency: 'SAR',
  probability: 50,
  expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  closedAt: null,
  status: 'open',
  lostReason: null,
  tags: [],
  customFields: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock lead
 */
export const createMockLead = (overrides?: Partial<MockLead>): MockLead => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  ownerId: null,
  firstName: 'فهد',
  lastName: 'الدوسري',
  email: 'fahad@example.com',
  phone: '+966501234567',
  whatsapp: '+966501234567',
  source: 'whatsapp',
  sourceId: null,
  status: 'new',
  score: 0,
  scoreGrade: null,
  propertyType: 'villa',
  budget: new Decimal('2000000'),
  timeline: '3-6-months',
  location: 'الرياض',
  financingNeeded: true,
  convertedAt: null,
  convertedToContactId: null,
  convertedToDealId: null,
  notes: null,
  tags: [],
  customFields: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock activity
 */
export const createMockActivity = (overrides?: Partial<MockActivity>): MockActivity => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  createdById: overrides?.createdById || uuidv4(),
  contactId: null,
  dealId: null,
  type: 'call',
  subject: 'متابعة مع العميل',
  description: 'مكالمة متابعة للاستفسار عن احتياجات العميل',
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  isCompleted: false,
  completedAt: null,
  duration: null,
  outcome: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock conversation
 */
export const createMockConversation = (overrides?: Partial<MockConversation>): MockConversation => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  contactId: null,
  assignedToId: null,
  channel: 'whatsapp',
  channelId: '+966501234567',
  status: 'bot',
  qualificationData: {},
  lastMessageAt: new Date(),
  closedAt: null,
  closedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock message
 */
export const createMockMessage = (overrides?: Partial<MockMessage>): MockMessage => ({
  id: uuidv4(),
  conversationId: overrides?.conversationId || uuidv4(),
  direction: 'inbound',
  sender: 'customer',
  type: 'text',
  content: 'مرحبا، أبي أستفسر عن فيلا بالرياض',
  mediaUrl: null,
  transcription: null,
  duration: null,
  externalId: null,
  status: 'received',
  errorMessage: null,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Create a mock notification
 */
export const createMockNotification = (overrides?: Partial<MockNotification>): MockNotification => ({
  id: uuidv4(),
  tenantId: overrides?.tenantId || uuidv4(),
  userId: overrides?.userId || uuidv4(),
  type: 'new_message',
  title: 'رسالة جديدة',
  message: 'لديك رسالة جديدة من محمد العتيبي',
  data: {},
  isRead: false,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Create a mock refresh token
 */
export const createMockRefreshToken = (overrides?: Partial<MockRefreshToken>): MockRefreshToken => ({
  id: uuidv4(),
  userId: overrides?.userId || uuidv4(),
  token: `refresh-token-${uuidv4()}`,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// BATCH CREATION HELPERS
// ============================================

/**
 * Create multiple mock users
 */
export const createMockUsers = (count: number, baseOverrides?: Partial<MockUser>): MockUser[] =>
  Array.from({ length: count }, (_, i) =>
    createMockUser({
      ...baseOverrides,
      email: `user${i + 1}@saddah.io`,
      firstName: `مستخدم ${i + 1}`,
    }),
  );

/**
 * Create multiple mock contacts
 */
export const createMockContacts = (count: number, baseOverrides?: Partial<MockContact>): MockContact[] =>
  Array.from({ length: count }, (_, i) =>
    createMockContact({
      ...baseOverrides,
      email: `contact${i + 1}@example.com`,
      firstName: `جهة اتصال ${i + 1}`,
    }),
  );

/**
 * Create multiple mock activities
 */
export const createMockActivities = (count: number, baseOverrides?: Partial<MockActivity>): MockActivity[] =>
  Array.from({ length: count }, (_, i) =>
    createMockActivity({
      ...baseOverrides,
      subject: `نشاط ${i + 1}`,
    }),
  );

/**
 * Create multiple mock notifications
 */
export const createMockNotifications = (count: number, baseOverrides?: Partial<MockNotification>): MockNotification[] =>
  Array.from({ length: count }, (_, i) =>
    createMockNotification({
      ...baseOverrides,
      title: `إشعار ${i + 1}`,
    }),
  );
