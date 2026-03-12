import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProjectType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  MIXED = 'mixed',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  COMING_SOON = 'coming_soon',
  SOLD_OUT = 'sold_out',
}

export class CreateProjectDto {
  @ApiProperty({ description: 'اسم المشروع', example: 'برج الياسمين' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'المدينة', example: 'الرياض' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: 'الحي', example: 'حي الياسمين' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    description: 'نوع المشروع',
    enum: ProjectType,
    default: ProjectType.RESIDENTIAL,
  })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiPropertyOptional({ description: 'وصف المشروع' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'إجمالي عدد الوحدات',
    example: 50,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalUnits?: number;

  @ApiPropertyOptional({
    description: 'حالة المشروع',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'صور المشروع', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'هل المشروع نشط؟', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
