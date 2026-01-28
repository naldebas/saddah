// src/modules/settings/settings.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';
import { SettingsService } from './settings.service';
import { UpdateTenantSettingsDto, TenantSettingsResponseDto } from './dto/tenant-settings.dto';
import { UpdateNotificationPreferencesDto, NotificationPreferencesResponseDto } from './dto/notification-preferences.dto';
import { UpdateUserPreferencesDto, UserPreferencesResponseDto } from './dto/user-preferences.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'settings',
  version: '1',
})
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ============================================
  // TENANT SETTINGS
  // ============================================

  @Get('tenant')
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Returns tenant settings', type: TenantSettingsResponseDto })
  async getTenantSettings(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getTenantSettings(user.tenantId);
  }

  @Patch('tenant')
  @ApiOperation({ summary: 'Update tenant settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns updated tenant settings', type: TenantSettingsResponseDto })
  async updateTenantSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.settingsService.updateTenantSettings(user.tenantId, user.role, dto);
  }

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Returns notification preferences', type: NotificationPreferencesResponseDto })
  async getNotificationPreferences(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getNotificationPreferences(user.sub);
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Returns updated notification preferences', type: NotificationPreferencesResponseDto })
  async updateNotificationPreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.settingsService.updateNotificationPreferences(user.sub, dto);
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Returns user preferences', type: UserPreferencesResponseDto })
  async getUserPreferences(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getUserPreferences(user.sub);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Returns updated user preferences', type: UserPreferencesResponseDto })
  async updateUserPreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.settingsService.updateUserPreferences(user.sub, dto);
  }

  // ============================================
  // PLAN INFO
  // ============================================

  @Get('plan')
  @ApiOperation({ summary: 'Get current plan info and usage' })
  @ApiResponse({ status: 200, description: 'Returns plan info and usage statistics' })
  async getPlanInfo(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getPlanInfo(user.tenantId);
  }
}
