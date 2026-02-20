/**
 * Qualification State Machine States
 * SADDAH CRM AI Module
 *
 * Defines all qualification states and their properties
 */

/**
 * Qualification states enum
 */
export enum QualificationState {
  INITIAL = 'initial',
  GREETING = 'greeting',
  ASK_NAME = 'ask_name',
  ASK_PROPERTY_TYPE = 'ask_property_type',
  ASK_LOCATION = 'ask_location',
  ASK_BUDGET = 'ask_budget',
  ASK_TIMELINE = 'ask_timeline',
  ASK_FINANCING = 'ask_financing',
  QUALIFIED = 'qualified',
  OFFER_APPOINTMENT = 'offer_appointment',
  SCHEDULE_APPOINTMENT = 'schedule_appointment',
  HUMAN_HANDOFF = 'human_handoff',
  CLOSED = 'closed',
}

/**
 * State metadata
 */
export interface StateMetadata {
  name: string;
  nameAr: string;
  description: string;
  isTerminal: boolean;
  requiredData: string[];
  priority: number;
}

/**
 * State definitions with metadata
 */
export const STATE_METADATA: Record<QualificationState, StateMetadata> = {
  [QualificationState.INITIAL]: {
    name: 'Initial',
    nameAr: 'البداية',
    description: 'Starting state for new conversations',
    isTerminal: false,
    requiredData: [],
    priority: 0,
  },
  [QualificationState.GREETING]: {
    name: 'Greeting',
    nameAr: 'الترحيب',
    description: 'Bot greets the user',
    isTerminal: false,
    requiredData: [],
    priority: 1,
  },
  [QualificationState.ASK_NAME]: {
    name: 'Ask Name',
    nameAr: 'السؤال عن الاسم',
    description: 'Collecting user name',
    isTerminal: false,
    requiredData: ['name'],
    priority: 2,
  },
  [QualificationState.ASK_PROPERTY_TYPE]: {
    name: 'Ask Property Type',
    nameAr: 'السؤال عن نوع العقار',
    description: 'Identifying property type preference',
    isTerminal: false,
    requiredData: ['propertyType'],
    priority: 3,
  },
  [QualificationState.ASK_LOCATION]: {
    name: 'Ask Location',
    nameAr: 'السؤال عن الموقع',
    description: 'Identifying location preference',
    isTerminal: false,
    requiredData: ['location'],
    priority: 4,
  },
  [QualificationState.ASK_BUDGET]: {
    name: 'Ask Budget',
    nameAr: 'السؤال عن الميزانية',
    description: 'Identifying budget range',
    isTerminal: false,
    requiredData: ['budget'],
    priority: 5,
  },
  [QualificationState.ASK_TIMELINE]: {
    name: 'Ask Timeline',
    nameAr: 'السؤال عن الوقت',
    description: 'Identifying purchase timeline',
    isTerminal: false,
    requiredData: ['timeline'],
    priority: 6,
  },
  [QualificationState.ASK_FINANCING]: {
    name: 'Ask Financing',
    nameAr: 'السؤال عن التمويل',
    description: 'Identifying financing needs',
    isTerminal: false,
    requiredData: ['financingNeeded'],
    priority: 7,
  },
  [QualificationState.QUALIFIED]: {
    name: 'Qualified',
    nameAr: 'مؤهل',
    description: 'Lead is fully qualified',
    isTerminal: false,
    requiredData: [],
    priority: 8,
  },
  [QualificationState.OFFER_APPOINTMENT]: {
    name: 'Offer Appointment',
    nameAr: 'عرض موعد',
    description: 'Offering to schedule an appointment',
    isTerminal: false,
    requiredData: [],
    priority: 9,
  },
  [QualificationState.SCHEDULE_APPOINTMENT]: {
    name: 'Schedule Appointment',
    nameAr: 'جدولة موعد',
    description: 'Scheduling appointment details',
    isTerminal: false,
    requiredData: ['appointmentDate'],
    priority: 10,
  },
  [QualificationState.HUMAN_HANDOFF]: {
    name: 'Human Handoff',
    nameAr: 'تحويل لموظف',
    description: 'Transferring to human agent',
    isTerminal: true,
    requiredData: [],
    priority: 99,
  },
  [QualificationState.CLOSED]: {
    name: 'Closed',
    nameAr: 'مغلق',
    description: 'Conversation ended',
    isTerminal: true,
    requiredData: [],
    priority: 100,
  },
};

/**
 * Qualification data collected during conversation
 */
export interface QualificationData {
  state: QualificationState;
  previousStates: QualificationState[];
  name?: string;
  phone?: string;
  email?: string;
  propertyType?: string;
  location?: {
    city?: string;
    district?: string;
    region?: string;
  };
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  timeline?: string;
  financingNeeded?: boolean;
  transactionType?: string;
  isUrgent?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string[];
  qualificationScore?: number;
  qualifiedAt?: string;
  handoffReason?: string;
  lastUpdated: string;
}

/**
 * Initialize empty qualification data
 */
export function createInitialQualificationData(): QualificationData {
  return {
    state: QualificationState.INITIAL,
    previousStates: [],
    notes: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate qualification score based on collected data
 */
export function calculateQualificationScore(data: QualificationData): number {
  let score = 0;
  const maxScore = 100;

  // Name: 10 points
  if (data.name) score += 10;

  // Property type: 15 points
  if (data.propertyType) score += 15;

  // Location: 15 points
  if (data.location?.city || data.location?.district) score += 15;

  // Budget: 20 points
  if (data.budget?.max || data.budget?.min) score += 20;

  // Timeline: 15 points
  if (data.timeline) {
    score += 15;
    // Bonus for immediate timeline
    if (data.timeline === 'immediate') score += 5;
  }

  // Financing: 10 points
  if (data.financingNeeded !== undefined) score += 10;

  // Urgency bonus: 5 points
  if (data.isUrgent) score += 5;

  // Phone: 5 points
  if (data.phone) score += 5;

  return Math.min(score, maxScore);
}

/**
 * Check if lead is fully qualified
 */
export function isFullyQualified(data: QualificationData): boolean {
  const score = calculateQualificationScore(data);
  return score >= 60;
}

/**
 * Get missing qualification fields
 */
export function getMissingFields(data: QualificationData): string[] {
  const missing: string[] = [];

  if (!data.name) missing.push('name');
  if (!data.propertyType) missing.push('propertyType');
  if (!data.location?.city && !data.location?.district) missing.push('location');
  if (!data.budget?.max && !data.budget?.min) missing.push('budget');
  if (!data.timeline) missing.push('timeline');
  if (data.financingNeeded === undefined) missing.push('financingNeeded');

  return missing;
}
