// src/modules/integrations/botpress/botpress.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { BotpressConfigService } from './botpress-config.service';
import { BotpressClientService } from './botpress-client.service';
import { BotpressSyncService } from './botpress-sync.service';
import {
  CreateBotpressConfigDto,
  UpdateBotpressConfigDto,
  BotpressConfigResponseDto,
  BotpressTestResultDto,
  BotpressConversationResponseDto,
} from './dto';

@ApiTags('Botpress Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/settings/botpress')
export class BotpressController {
  constructor(
    private readonly configService: BotpressConfigService,
    private readonly clientService: BotpressClientService,
    private readonly syncService: BotpressSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Botpress configuration' })
  @ApiResponse({ status: 200, type: BotpressConfigResponseDto })
  async getConfig(@Request() req: any): Promise<BotpressConfigResponseDto | null> {
    return this.configService.getConfig(req.user.tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update Botpress configuration' })
  @ApiResponse({ status: 200, type: BotpressConfigResponseDto })
  async updateConfig(
    @Request() req: any,
    @Body() dto: CreateBotpressConfigDto,
  ): Promise<BotpressConfigResponseDto> {
    return this.configService.upsertConfig(req.user.tenantId, req.user.role, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete Botpress configuration' })
  @ApiResponse({ status: 204 })
  async deleteConfig(@Request() req: any): Promise<void> {
    await this.configService.deleteConfig(req.user.tenantId, req.user.role);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test Botpress connection' })
  @ApiResponse({ status: 200, type: BotpressTestResultDto })
  async testConnection(@Request() req: any): Promise<BotpressTestResultDto> {
    const configData = await this.configService.getConfigWithCredentials(req.user.tenantId);

    if (!configData) {
      return {
        success: false,
        error: 'Botpress configuration not found',
        testedAt: new Date(),
      };
    }

    const { config, credentials } = configData;

    const result = await this.clientService.testConnection(
      config.botId,
      config.workspaceId,
      credentials,
    );

    // Update verification status
    await this.configService.updateVerificationStatus(req.user.tenantId, result.success);

    return {
      ...result,
      testedAt: new Date(),
    };
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate Botpress integration' })
  @ApiResponse({ status: 200, type: BotpressConfigResponseDto })
  async activate(@Request() req: any): Promise<BotpressConfigResponseDto> {
    return this.configService.activate(req.user.tenantId, req.user.role);
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate Botpress integration' })
  @ApiResponse({ status: 200, type: BotpressConfigResponseDto })
  async deactivate(@Request() req: any): Promise<BotpressConfigResponseDto> {
    return this.configService.deactivate(req.user.tenantId, req.user.role);
  }
}

@ApiTags('Botpress Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/botpress/conversations')
export class BotpressConversationsController {
  constructor(
    private readonly configService: BotpressConfigService,
    private readonly clientService: BotpressClientService,
    private readonly syncService: BotpressSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List Botpress conversations' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiResponse({ status: 200 })
  async listConversations(
    @Request() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('state') state?: string,
  ): Promise<{ data: BotpressConversationResponseDto[]; total: number }> {
    return this.syncService.listConversations(req.user.tenantId, {
      skip: skip ? parseInt(String(skip)) : undefined,
      take: take ? parseInt(String(take)) : undefined,
      state,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Botpress conversation details' })
  @ApiParam({ name: 'id', description: 'Saddah conversation ID' })
  @ApiResponse({ status: 200, type: BotpressConversationResponseDto })
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<BotpressConversationResponseDto | null> {
    return this.syncService.getConversationMapping(req.user.tenantId, conversationId);
  }

  @Post(':id/handoff')
  @ApiOperation({ summary: 'Force handoff to human agent' })
  @ApiParam({ name: 'id', description: 'Saddah conversation ID' })
  @ApiResponse({ status: 200 })
  async forceHandoff(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<{ success: boolean }> {
    const mapping = await this.syncService.getConversationMapping(
      req.user.tenantId,
      conversationId,
    );

    if (!mapping) {
      return { success: false };
    }

    const configData = await this.configService.getConfigWithCredentials(req.user.tenantId);
    if (!configData) {
      return { success: false };
    }

    const { config, credentials } = configData;

    await this.clientService.triggerHandoff(
      config.botId,
      credentials,
      mapping.botpressConvId,
      'Manual handoff by agent',
    );

    await this.syncService.updateState(mapping.id, 'human_handoff');

    return { success: true };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume bot after handoff' })
  @ApiParam({ name: 'id', description: 'Saddah conversation ID' })
  @ApiResponse({ status: 200 })
  async resumeBot(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<{ success: boolean }> {
    const mapping = await this.syncService.getConversationMapping(
      req.user.tenantId,
      conversationId,
    );

    if (!mapping) {
      return { success: false };
    }

    const configData = await this.configService.getConfigWithCredentials(req.user.tenantId);
    if (!configData) {
      return { success: false };
    }

    const { config, credentials } = configData;

    await this.clientService.resumeBot(config.botId, credentials, mapping.botpressConvId);

    await this.syncService.updateState(mapping.id, 'active');

    return { success: true };
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync conversation state from Botpress' })
  @ApiParam({ name: 'id', description: 'Saddah conversation ID' })
  @ApiResponse({ status: 200 })
  async syncState(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<{ success: boolean }> {
    await this.syncService.syncConversationState(req.user.tenantId, conversationId);
    return { success: true };
  }
}
