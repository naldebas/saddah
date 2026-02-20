/**
 * Qualification State Machine Transitions
 * SADDAH CRM AI Module
 *
 * Defines state transition rules and triggers
 */

import { QualificationState, QualificationData } from './states';
import { UserIntent, ExtractedEntities } from '../dialect/saudi-dialect.service';

/**
 * Transition trigger types
 */
export enum TransitionTrigger {
  USER_MESSAGE = 'user_message',
  INTENT_DETECTED = 'intent_detected',
  ENTITY_EXTRACTED = 'entity_extracted',
  TIMEOUT = 'timeout',
  MANUAL_OVERRIDE = 'manual_override',
  SYSTEM_EVENT = 'system_event',
}

/**
 * Transition definition
 */
export interface Transition {
  from: QualificationState | QualificationState[];
  to: QualificationState;
  trigger: TransitionTrigger;
  condition?: (data: QualificationData, context: TransitionContext) => boolean;
  priority: number;
}

/**
 * Context for transition evaluation
 */
export interface TransitionContext {
  intent: UserIntent;
  entities: ExtractedEntities;
  messageCount: number;
  lastMessageTime?: Date;
  currentTime: Date;
}

/**
 * Transition result
 */
export interface TransitionResult {
  newState: QualificationState;
  transition: Transition;
  updatedData: Partial<QualificationData>;
}

/**
 * Define all valid transitions
 */
export const TRANSITIONS: Transition[] = [
  // Initial state transitions
  {
    from: QualificationState.INITIAL,
    to: QualificationState.GREETING,
    trigger: TransitionTrigger.USER_MESSAGE,
    condition: (data, ctx) => ctx.intent === UserIntent.GREETING,
    priority: 1,
  },
  {
    from: QualificationState.INITIAL,
    to: QualificationState.ASK_PROPERTY_TYPE,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => !!ctx.entities.propertyType,
    priority: 2,
  },
  {
    from: QualificationState.INITIAL,
    to: QualificationState.GREETING,
    trigger: TransitionTrigger.USER_MESSAGE,
    priority: 10, // Default fallback
  },

  // Greeting transitions
  {
    from: QualificationState.GREETING,
    to: QualificationState.ASK_NAME,
    trigger: TransitionTrigger.USER_MESSAGE,
    condition: (data) => !data.name,
    priority: 1,
  },
  {
    from: QualificationState.GREETING,
    to: QualificationState.ASK_PROPERTY_TYPE,
    trigger: TransitionTrigger.USER_MESSAGE,
    condition: (data) => !!data.name && !data.propertyType,
    priority: 2,
  },

  // Ask name transitions
  {
    from: QualificationState.ASK_NAME,
    to: QualificationState.ASK_PROPERTY_TYPE,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => !!ctx.entities.name || !!data.name,
    priority: 1,
  },
  {
    from: QualificationState.ASK_NAME,
    to: QualificationState.ASK_PROPERTY_TYPE,
    trigger: TransitionTrigger.USER_MESSAGE,
    condition: (data, ctx) => ctx.intent === UserIntent.PROVIDE_INFO,
    priority: 2,
  },

  // Ask property type transitions
  {
    from: QualificationState.ASK_PROPERTY_TYPE,
    to: QualificationState.ASK_LOCATION,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => !!ctx.entities.propertyType || !!data.propertyType,
    priority: 1,
  },

  // Ask location transitions
  {
    from: QualificationState.ASK_LOCATION,
    to: QualificationState.ASK_BUDGET,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) =>
      !!ctx.entities.location || !!data.location?.city || !!data.location?.district,
    priority: 1,
  },

  // Ask budget transitions
  {
    from: QualificationState.ASK_BUDGET,
    to: QualificationState.ASK_TIMELINE,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => !!ctx.entities.budget || !!data.budget,
    priority: 1,
  },

  // Ask timeline transitions
  {
    from: QualificationState.ASK_TIMELINE,
    to: QualificationState.ASK_FINANCING,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => !!ctx.entities.timeline || !!data.timeline,
    priority: 1,
  },
  {
    from: QualificationState.ASK_TIMELINE,
    to: QualificationState.ASK_FINANCING,
    trigger: TransitionTrigger.INTENT_DETECTED,
    condition: (data, ctx) =>
      ctx.intent === UserIntent.AFFIRMATION || ctx.intent === UserIntent.NEGATION,
    priority: 2,
  },

  // Ask financing transitions
  {
    from: QualificationState.ASK_FINANCING,
    to: QualificationState.QUALIFIED,
    trigger: TransitionTrigger.INTENT_DETECTED,
    condition: (data, ctx) =>
      ctx.intent === UserIntent.AFFIRMATION || ctx.intent === UserIntent.NEGATION,
    priority: 1,
  },
  {
    from: QualificationState.ASK_FINANCING,
    to: QualificationState.QUALIFIED,
    trigger: TransitionTrigger.ENTITY_EXTRACTED,
    condition: (data, ctx) => ctx.entities.financingNeeded !== undefined,
    priority: 2,
  },

  // Qualified transitions
  {
    from: QualificationState.QUALIFIED,
    to: QualificationState.OFFER_APPOINTMENT,
    trigger: TransitionTrigger.SYSTEM_EVENT,
    priority: 1,
  },

  // Offer appointment transitions
  {
    from: QualificationState.OFFER_APPOINTMENT,
    to: QualificationState.SCHEDULE_APPOINTMENT,
    trigger: TransitionTrigger.INTENT_DETECTED,
    condition: (data, ctx) => ctx.intent === UserIntent.AFFIRMATION,
    priority: 1,
  },
  {
    from: QualificationState.OFFER_APPOINTMENT,
    to: QualificationState.HUMAN_HANDOFF,
    trigger: TransitionTrigger.INTENT_DETECTED,
    condition: (data, ctx) =>
      ctx.intent === UserIntent.NEGATION || ctx.intent === UserIntent.QUESTION,
    priority: 2,
  },

  // Schedule appointment transitions
  {
    from: QualificationState.SCHEDULE_APPOINTMENT,
    to: QualificationState.HUMAN_HANDOFF,
    trigger: TransitionTrigger.SYSTEM_EVENT,
    priority: 1,
  },

  // Human handoff triggers (from any state)
  {
    from: [
      QualificationState.INITIAL,
      QualificationState.GREETING,
      QualificationState.ASK_NAME,
      QualificationState.ASK_PROPERTY_TYPE,
      QualificationState.ASK_LOCATION,
      QualificationState.ASK_BUDGET,
      QualificationState.ASK_TIMELINE,
      QualificationState.ASK_FINANCING,
      QualificationState.QUALIFIED,
      QualificationState.OFFER_APPOINTMENT,
      QualificationState.SCHEDULE_APPOINTMENT,
    ],
    to: QualificationState.HUMAN_HANDOFF,
    trigger: TransitionTrigger.INTENT_DETECTED,
    condition: (data, ctx) => ctx.intent === UserIntent.HANDOFF_REQUEST,
    priority: 0, // Highest priority
  },
];

/**
 * Get available transitions from a state
 */
export function getAvailableTransitions(
  currentState: QualificationState,
): Transition[] {
  return TRANSITIONS.filter((t) => {
    if (Array.isArray(t.from)) {
      return t.from.includes(currentState);
    }
    return t.from === currentState;
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Evaluate and get the next valid transition
 */
export function evaluateTransition(
  currentState: QualificationState,
  data: QualificationData,
  context: TransitionContext,
): TransitionResult | null {
  const availableTransitions = getAvailableTransitions(currentState);

  for (const transition of availableTransitions) {
    // Check if condition is met (or no condition)
    if (!transition.condition || transition.condition(data, context)) {
      const updatedData: Partial<QualificationData> = {
        previousStates: [...data.previousStates, currentState],
        lastUpdated: new Date().toISOString(),
      };

      // Add extracted entities to data
      if (context.entities.name) updatedData.name = context.entities.name;
      if (context.entities.phone) updatedData.phone = context.entities.phone;
      if (context.entities.email) updatedData.email = context.entities.email;
      if (context.entities.propertyType) {
        updatedData.propertyType = context.entities.propertyType.type;
      }
      if (context.entities.location) {
        updatedData.location = context.entities.location;
      }
      if (context.entities.budget) {
        updatedData.budget = context.entities.budget;
      }
      if (context.entities.timeline) {
        updatedData.timeline = context.entities.timeline;
      }
      if (context.entities.financingNeeded !== undefined) {
        updatedData.financingNeeded = context.entities.financingNeeded;
      }
      if (context.entities.isUrgent) {
        updatedData.isUrgent = context.entities.isUrgent;
      }

      return {
        newState: transition.to,
        transition,
        updatedData,
      };
    }
  }

  return null;
}

/**
 * Get the next state to collect missing data
 */
export function getNextCollectionState(
  data: QualificationData,
): QualificationState {
  // Check what data is missing and return appropriate state
  if (!data.name) return QualificationState.ASK_NAME;
  if (!data.propertyType) return QualificationState.ASK_PROPERTY_TYPE;
  if (!data.location?.city && !data.location?.district) {
    return QualificationState.ASK_LOCATION;
  }
  if (!data.budget?.max && !data.budget?.min) return QualificationState.ASK_BUDGET;
  if (!data.timeline) return QualificationState.ASK_TIMELINE;
  if (data.financingNeeded === undefined) return QualificationState.ASK_FINANCING;

  // All data collected
  return QualificationState.QUALIFIED;
}
