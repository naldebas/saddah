// src/modules/settings/dto/notification-preferences.dto.ts
import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Deal update notifications' })
  @IsOptional()
  @IsBoolean()
  dealUpdates?: boolean;

  @ApiPropertyOptional({ description: 'New lead notifications' })
  @IsOptional()
  @IsBoolean()
  newLeads?: boolean;

  @ApiPropertyOptional({ description: 'Activity reminder notifications' })
  @IsOptional()
  @IsBoolean()
  activityReminders?: boolean;

  @ApiPropertyOptional({ description: 'Daily digest email' })
  @IsOptional()
  @IsBoolean()
  dailyDigest?: boolean;

  @ApiPropertyOptional({ description: 'Weekly report email' })
  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;

  @ApiPropertyOptional({ description: 'Conversation assignment notifications' })
  @IsOptional()
  @IsBoolean()
  conversationAssignments?: boolean;
}

export class NotificationPreferencesResponseDto {
  @ApiPropertyOptional()
  emailNotifications: boolean;

  @ApiPropertyOptional()
  pushNotifications: boolean;

  @ApiPropertyOptional()
  dealUpdates: boolean;

  @ApiPropertyOptional()
  newLeads: boolean;

  @ApiPropertyOptional()
  activityReminders: boolean;

  @ApiPropertyOptional()
  dailyDigest: boolean;

  @ApiPropertyOptional()
  weeklyReport: boolean;

  @ApiPropertyOptional()
  conversationAssignments: boolean;
}
