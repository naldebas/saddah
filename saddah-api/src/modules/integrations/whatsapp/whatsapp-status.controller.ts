// src/modules/integrations/whatsapp/whatsapp-status.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WhatsAppStatusService, DeliveryStatus } from './whatsapp-status.service';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('WhatsApp Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/messages')
export class WhatsAppStatusController {
  constructor(private readonly statusService: WhatsAppStatusService) {}

  @Get(':messageId/status')
  @ApiOperation({ summary: 'Get message delivery status' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message status retrieved',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(DeliveryStatus) },
        externalId: { type: 'string' },
        errorMessage: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getDeliveryStatus(
    @Param('messageId') messageId: string,
  ): Promise<{
    status: string;
    externalId?: string;
    errorMessage?: string;
    updatedAt: Date;
  }> {
    const status = await this.statusService.getDeliveryStatus(messageId);

    if (!status) {
      throw new NotFoundException('Message not found');
    }

    return status;
  }

  @Get('conversation/:conversationId/stats')
  @ApiOperation({ summary: 'Get delivery statistics for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery statistics retrieved',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        sent: { type: 'number' },
        delivered: { type: 'number' },
        read: { type: 'number' },
        failed: { type: 'number' },
        deliveryRate: { type: 'number' },
        readRate: { type: 'number' },
      },
    },
  })
  async getConversationStats(
    @Param('conversationId') conversationId: string,
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }> {
    return this.statusService.getConversationDeliveryStats(conversationId);
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed messages for retry' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({
    status: 200,
    description: 'Failed messages retrieved',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              errorMessage: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              conversation: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  channelId: { type: 'string' },
                  channel: { type: 'string' },
                },
              },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  async getFailedMessages(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    messages: any[];
    total: number;
  }> {
    return this.statusService.getFailedMessages(user.tenantId, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post(':messageId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed message' })
  @ApiParam({ name: 'messageId', description: 'Message ID to retry' })
  @ApiResponse({
    status: 200,
    description: 'Message queued for retry',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Message cannot be retried' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async retryMessage(
    @Param('messageId') messageId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.statusService.retryFailedMessage(messageId);

    if (!result.success) {
      if (result.error === 'Message not found') {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      message: 'Message queued for retry',
    };
  }
}
