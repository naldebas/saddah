/**
 * State Machine Service
 * SADDAH CRM AI Module
 *
 * Manages qualification state transitions for conversations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  QualificationState,
  QualificationData,
  createInitialQualificationData,
  calculateQualificationScore,
  isFullyQualified,
  getMissingFields,
  STATE_METADATA,
} from './states';
import {
  Transition,
  TransitionContext,
  TransitionResult,
  TransitionTrigger,
  evaluateTransition,
  getNextCollectionState,
  getAvailableTransitions,
} from './transitions';
import {
  SaudiDialectService,
  UserIntent,
  DialectAnalysisResult,
} from '../dialect/saudi-dialect.service';

/**
 * State machine event for logging/analytics
 */
export interface StateMachineEvent {
  timestamp: Date;
  fromState: QualificationState;
  toState: QualificationState;
  trigger: TransitionTrigger;
  intent?: UserIntent;
  messageContent?: string;
}

/**
 * State machine response
 */
export interface StateMachineResponse {
  newState: QualificationState;
  updatedData: QualificationData;
  requiresResponse: boolean;
  responseType: 'prompt' | 'confirmation' | 'handoff' | 'complete';
  event?: StateMachineEvent;
}

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(private readonly dialectService: SaudiDialectService) {}

  /**
   * Process a user message and transition state
   */
  processMessage(
    message: string,
    currentData: QualificationData | null,
    messageCount: number = 1,
  ): StateMachineResponse {
    // Initialize data if needed
    const data = currentData || createInitialQualificationData();

    // Analyze the message
    const analysis = this.dialectService.analyzeMessage(message);

    this.logger.debug(
      `Processing message in state ${data.state}: "${message.substring(0, 50)}..."`,
    );
    this.logger.debug(`Detected intent: ${analysis.intent}`);

    // Check for immediate handoff
    if (analysis.requiresHandoff) {
      return this.handleHandoff(data, 'User requested human agent');
    }

    // Build transition context
    const context: TransitionContext = {
      intent: analysis.intent,
      entities: analysis.entities,
      messageCount,
      currentTime: new Date(),
    };

    // Evaluate transition
    const transitionResult = evaluateTransition(data.state, data, context);

    if (transitionResult) {
      return this.applyTransition(data, transitionResult, analysis, message);
    }

    // No transition found - stay in current state but update data
    const updatedData = this.updateDataFromAnalysis(data, analysis);
    return {
      newState: data.state,
      updatedData,
      requiresResponse: true,
      responseType: 'prompt',
    };
  }

  /**
   * Apply a transition and return response
   */
  private applyTransition(
    data: QualificationData,
    result: TransitionResult,
    analysis: DialectAnalysisResult,
    message: string,
  ): StateMachineResponse {
    const updatedData: QualificationData = {
      ...data,
      ...result.updatedData,
      state: result.newState,
    };

    // Update data with extracted entities
    const finalData = this.updateDataFromAnalysis(updatedData, analysis);

    // Calculate qualification score
    finalData.qualificationScore = calculateQualificationScore(finalData);

    // Check if fully qualified
    if (
      result.newState === QualificationState.QUALIFIED ||
      isFullyQualified(finalData)
    ) {
      finalData.qualifiedAt = new Date().toISOString();
    }

    const event: StateMachineEvent = {
      timestamp: new Date(),
      fromState: data.state,
      toState: result.newState,
      trigger: result.transition.trigger,
      intent: analysis.intent,
      messageContent: message.substring(0, 100),
    };

    this.logger.log(
      `State transition: ${data.state} -> ${result.newState} (trigger: ${result.transition.trigger})`,
    );

    return {
      newState: result.newState,
      updatedData: finalData,
      requiresResponse: true,
      responseType: this.getResponseType(result.newState),
      event,
    };
  }

  /**
   * Handle handoff to human agent
   */
  private handleHandoff(
    data: QualificationData,
    reason: string,
  ): StateMachineResponse {
    const updatedData: QualificationData = {
      ...data,
      state: QualificationState.HUMAN_HANDOFF,
      previousStates: [...data.previousStates, data.state],
      handoffReason: reason,
      qualificationScore: calculateQualificationScore(data),
      lastUpdated: new Date().toISOString(),
    };

    this.logger.log(`Handoff triggered: ${reason}`);

    return {
      newState: QualificationState.HUMAN_HANDOFF,
      updatedData,
      requiresResponse: true,
      responseType: 'handoff',
    };
  }

  /**
   * Update qualification data from analysis
   */
  private updateDataFromAnalysis(
    data: QualificationData,
    analysis: DialectAnalysisResult,
  ): QualificationData {
    const updated = { ...data };
    const entities = analysis.entities;

    if (entities.name && !data.name) {
      updated.name = entities.name;
    }
    if (entities.phone && !data.phone) {
      updated.phone = entities.phone;
    }
    if (entities.email && !data.email) {
      updated.email = entities.email;
    }
    if (entities.propertyType && !data.propertyType) {
      updated.propertyType = entities.propertyType.type;
    }
    if (entities.location && !data.location?.city) {
      updated.location = entities.location;
    }
    if (entities.budget && !data.budget) {
      updated.budget = entities.budget;
    }
    if (entities.timeline && !data.timeline) {
      updated.timeline = entities.timeline;
    }
    if (entities.financingNeeded !== undefined && data.financingNeeded === undefined) {
      updated.financingNeeded = entities.financingNeeded;
    }
    if (entities.transactionType && !data.transactionType) {
      updated.transactionType = entities.transactionType;
    }
    if (entities.isUrgent) {
      updated.isUrgent = entities.isUrgent;
    }

    updated.lastUpdated = new Date().toISOString();
    return updated;
  }

  /**
   * Determine response type based on state
   */
  private getResponseType(
    state: QualificationState,
  ): 'prompt' | 'confirmation' | 'handoff' | 'complete' {
    switch (state) {
      case QualificationState.HUMAN_HANDOFF:
        return 'handoff';
      case QualificationState.CLOSED:
        return 'complete';
      case QualificationState.QUALIFIED:
      case QualificationState.OFFER_APPOINTMENT:
      case QualificationState.SCHEDULE_APPOINTMENT:
        return 'confirmation';
      default:
        return 'prompt';
    }
  }

  /**
   * Get current state information
   */
  getStateInfo(data: QualificationData): {
    currentState: QualificationState;
    metadata: typeof STATE_METADATA[QualificationState];
    qualificationScore: number;
    missingFields: string[];
    isQualified: boolean;
    availableTransitions: Transition[];
  } {
    return {
      currentState: data.state,
      metadata: STATE_METADATA[data.state],
      qualificationScore: calculateQualificationScore(data),
      missingFields: getMissingFields(data),
      isQualified: isFullyQualified(data),
      availableTransitions: getAvailableTransitions(data.state),
    };
  }

  /**
   * Force transition to a specific state
   */
  forceTransition(
    data: QualificationData,
    newState: QualificationState,
    reason?: string,
  ): QualificationData {
    const updated: QualificationData = {
      ...data,
      state: newState,
      previousStates: [...data.previousStates, data.state],
      lastUpdated: new Date().toISOString(),
    };

    if (reason) {
      updated.notes = [...(updated.notes || []), `Force transition: ${reason}`];
    }

    if (newState === QualificationState.HUMAN_HANDOFF) {
      updated.handoffReason = reason || 'Manual handoff';
    }

    this.logger.log(`Forced transition: ${data.state} -> ${newState} (${reason})`);

    return updated;
  }

  /**
   * Get recommended next state for data collection
   */
  getRecommendedNextState(data: QualificationData): QualificationState {
    return getNextCollectionState(data);
  }

  /**
   * Reset state machine to initial state
   */
  reset(): QualificationData {
    return createInitialQualificationData();
  }
}
