/**
 * AI Module Exports
 * SADDAH CRM
 */

// Module
export { AiModule } from './ai.module';

// Services
export { LlmService } from './llm.service';
export { SaudiDialectService, UserIntent } from './dialect/saudi-dialect.service';
export { StateMachineService } from './state-machine/state-machine.service';
export { ContextService } from './context/context.service';

// Types and configs
export * from './llm.config';
export * from './state-machine/states';
export * from './state-machine/transitions';
export * from './dialect/patterns';
export * from './dialect/real-estate-terms';
export * from './prompts/system-prompt';
export * from './prompts/state-prompts';
export * from './prompts/few-shot-examples';
export * from './context/context-builder';
