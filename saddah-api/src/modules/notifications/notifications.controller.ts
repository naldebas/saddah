// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'جلب جميع الإشعارات' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة الإشعارات' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findAllForUser(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'تحديد إشعار كمقروء' })
  @ApiResponse({ status: 200, description: 'تم تحديث الإشعار' })
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'تحديد جميع الإشعارات كمقروءة' })
  @ApiResponse({ status: 200, description: 'تم تحديث الإشعارات' })
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف إشعار' })
  @ApiResponse({ status: 200, description: 'تم حذف الإشعار' })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id') notificationId: string,
  ) {
    const result = await this.notificationsService.delete(userId, notificationId);
    return { success: result };
  }

  @Delete()
  @ApiOperation({ summary: 'حذف جميع الإشعارات' })
  @ApiResponse({ status: 200, description: 'تم حذف جميع الإشعارات' })
  async clearAll(@CurrentUser('sub') userId: string) {
    return this.notificationsService.clearAll(userId);
  }
}
