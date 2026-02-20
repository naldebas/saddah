/**
 * AI Module
 * SADDAH CRM
 *
 * Provides AI-powered features including:
 * - LLM integration (OpenAI GPT)
 * - Saudi dialect processing
 * - Qualification state machine
 * - Prompt management
 * - Context handling
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { LlmService } from './llm.service';
import { SaudiDialectService } from './dialect/saudi-dialect.service';
import { StateMachineService } from './state-machine/state-machine.service';
import { ContextService } from './context/context.service';

@Module({
  imports: [ConfigModule],
  providers: [
    LlmService,
    SaudiDialectService,
    StateMachineService,
    ContextService,
  ],
  exports: [
    LlmService,
    SaudiDialectService,
    StateMachineService,
    ContextService,
  ],
})
export class AiModule {}
