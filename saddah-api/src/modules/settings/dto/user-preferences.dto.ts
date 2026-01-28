// src/modules/settings/dto/user-preferences.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ enum: ThemePreference, example: 'light' })
  @IsOptional()
  @IsEnum(ThemePreference)
  theme?: ThemePreference;

  @ApiPropertyOptional({ example: 'ar' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: '#0D9488' })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({ example: 'compact' })
  @IsOptional()
  @IsString()
  tableViewDensity?: string;

  @ApiPropertyOptional({ example: 'kanban' })
  @IsOptional()
  @IsString()
  defaultDealView?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  defaultPageSize?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  showWelcomeScreen?: boolean;
}

export class UserPreferencesResponseDto {
  theme: ThemePreference;
  language: string;
  accentColor: string;
  tableViewDensity: string;
  defaultDealView: string;
  defaultPageSize: number;
  showWelcomeScreen: boolean;
}
