// src/modules/contacts/dto/bulk-operations.dto.ts
import { IsArray, IsString, IsOptional, ArrayMinSize, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({ description: 'قائمة معرفات جهات الاتصال للحذف', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}

export class BulkAssignDto {
  @ApiProperty({ description: 'قائمة معرفات جهات الاتصال', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ description: 'معرف المستخدم المسؤول الجديد' })
  @IsUUID('4')
  ownerId: string;
}

export class BulkTagDto {
  @ApiProperty({ description: 'قائمة معرفات جهات الاتصال', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ description: 'الوسوم لإضافتها', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiPropertyOptional({ description: 'استبدال الوسوم الحالية بدلاً من الإضافة' })
  @IsOptional()
  replace?: boolean;
}

export class BulkMoveToCompanyDto {
  @ApiProperty({ description: 'قائمة معرفات جهات الاتصال', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ description: 'معرف الشركة الجديدة' })
  @IsUUID('4')
  companyId: string;
}

export class BulkOperationResult {
  success: number;
  failed: number;
  errors?: { id: string; error: string }[];
}
