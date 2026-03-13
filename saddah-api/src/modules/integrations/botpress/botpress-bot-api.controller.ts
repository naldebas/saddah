// src/modules/integrations/botpress/botpress-bot-api.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { BotpressBotApiService } from './botpress-bot-api.service';

/**
 * Public API endpoints for Botpress bot to query live project data.
 * No JWT required — secured by tenantId validation only.
 * Only returns public-facing data (no sensitive info).
 */
@ApiTags('Bot API')
@Controller('bot-api/:tenantId')
export class BotpressBotApiController {
  private readonly logger = new Logger(BotpressBotApiController.name);

  constructor(private readonly botApiService: BotpressBotApiService) {}

  /**
   * Validate tenant before processing any request
   */
  private async ensureTenant(tenantId: string): Promise<void> {
    const valid = await this.botApiService.validateTenant(tenantId);
    if (!valid) {
      throw new BadRequestException('Invalid tenant');
    }
  }

  @Get('property-types')
  @ApiOperation({ summary: 'Get available property types from active projects' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'List of property types' })
  async getPropertyTypes(@Param('tenantId') tenantId: string): Promise<string[]> {
    try {
      await this.ensureTenant(tenantId);
      const types = await this.botApiService.getPropertyTypes(tenantId);
      this.logger.debug(`Property types for ${tenantId}: ${types.join(', ')}`);
      return types;
    } catch (error: any) {
      this.logger.error(`getPropertyTypes error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('districts')
  @ApiOperation({ summary: 'Get districts with available projects' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by property type' })
  @ApiResponse({ status: 200, description: 'List of districts' })
  async getDistricts(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: string,
  ): Promise<string[]> {
    try {
      await this.ensureTenant(tenantId);
      return await this.botApiService.getDistricts(tenantId, type);
    } catch (error: any) {
      this.logger.error(`getDistricts error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get projects with summary info' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiQuery({ name: 'district', required: false, description: 'Filter by district' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by property type' })
  @ApiResponse({ status: 200, description: 'List of projects with summaries' })
  async getProjects(
    @Param('tenantId') tenantId: string,
    @Query('district') district?: string,
    @Query('type') type?: string,
  ): Promise<any[]> {
    try {
      await this.ensureTenant(tenantId);
      return await this.botApiService.getProjects(tenantId, district, type);
    } catch (error: any) {
      this.logger.error(`getProjects error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get project details with available units summary' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectDetails(
    @Param('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    try {
      await this.ensureTenant(tenantId);
      return await this.botApiService.getProjectDetails(tenantId, projectId);
    } catch (error: any) {
      this.logger.error(`getProjectDetails error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
