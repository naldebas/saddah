// src/modules/settings/whatsapp-config.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppConfigService } from './whatsapp-config.service';
import {
  UpdateWhatsAppConfigDto,
  WhatsAppConfigResponseDto,
  TestConnectionResultDto,
} from './dto/whatsapp-config.dto';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('Settings - WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings/whatsapp')
export class WhatsAppConfigController {
  constructor(private readonly whatsAppConfigService: WhatsAppConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get WhatsApp configuration for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp configuration retrieved successfully',
    type: WhatsAppConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'WhatsApp configuration not found',
  })
  async getConfig(@CurrentUser() user: AuthUser): Promise<WhatsAppConfigResponseDto | { configured: false }> {
    const config = await this.whatsAppConfigService.getConfig(user.tenantId);

    if (!config) {
      return { configured: false };
    }

    return config;
  }

  @Put()
  @ApiOperation({ summary: 'Create or update WhatsApp configuration' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp configuration updated successfully',
    type: WhatsAppConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration data',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can update WhatsApp configuration',
  })
  async updateConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWhatsAppConfigDto,
  ): Promise<WhatsAppConfigResponseDto> {
    return this.whatsAppConfigService.updateConfig(user.tenantId, user.role, dto);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test WhatsApp connection' })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
    type: TestConnectionResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'WhatsApp configuration not found',
  })
  async testConnection(@CurrentUser() user: AuthUser): Promise<TestConnectionResultDto> {
    return this.whatsAppConfigService.testConnection(user.tenantId);
  }

  @Post('rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({
    status: 200,
    description: 'Webhook secret rotated successfully',
    schema: {
      type: 'object',
      properties: {
        webhookSecret: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can rotate webhook secrets',
  })
  @ApiResponse({
    status: 404,
    description: 'WhatsApp configuration not found',
  })
  async rotateWebhookSecret(
    @CurrentUser() user: AuthUser,
  ): Promise<{ webhookSecret: string; message: string }> {
    const newSecret = await this.whatsAppConfigService.rotateWebhookSecret(
      user.tenantId,
      user.role,
    );

    return {
      webhookSecret: newSecret,
      message: 'Webhook secret rotated successfully. Update your provider webhook settings.',
    };
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate WhatsApp integration' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp integration activated',
    type: WhatsAppConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot activate - connection not verified',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can activate WhatsApp',
  })
  async activate(@CurrentUser() user: AuthUser): Promise<WhatsAppConfigResponseDto> {
    return this.whatsAppConfigService.toggleActive(user.tenantId, user.role, true);
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate WhatsApp integration' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp integration deactivated',
    type: WhatsAppConfigResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can deactivate WhatsApp',
  })
  async deactivate(@CurrentUser() user: AuthUser): Promise<WhatsAppConfigResponseDto> {
    return this.whatsAppConfigService.toggleActive(user.tenantId, user.role, false);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete WhatsApp configuration' })
  @ApiResponse({
    status: 204,
    description: 'WhatsApp configuration deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can delete WhatsApp configuration',
  })
  @ApiResponse({
    status: 404,
    description: 'WhatsApp configuration not found',
  })
  async deleteConfig(@CurrentUser() user: AuthUser): Promise<void> {
    await this.whatsAppConfigService.deleteConfig(user.tenantId, user.role);
  }
}
