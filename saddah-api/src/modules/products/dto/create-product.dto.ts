import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductType {
  VILLA = 'villa',
  APARTMENT = 'apartment',
  TOWNHOUSE = 'townhouse',
  FLOOR = 'floor',
  LAND = 'land',
  OFFICE = 'office',
  SHOP = 'shop',
}

export enum ProductStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
}

export class CreateProductDto {
  @ApiProperty({ description: 'معرف المشروع' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'رقم الوحدة', example: 'A101' })
  @IsString()
  unitNumber: string;

  @ApiProperty({
    description: 'نوع الوحدة',
    enum: ProductType,
  })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ description: 'المساحة بالمتر المربع', example: 150 })
  @IsNumber()
  @Min(0)
  area: number;

  @ApiPropertyOptional({ description: 'عدد غرف النوم', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'عدد دورات المياه', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'رقم الطابق', example: 1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiProperty({ description: 'السعر', example: 800000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'حالة الوحدة',
    enum: ProductStatus,
    default: ProductStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'المميزات', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'صور الوحدة', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'هل الوحدة نشطة؟', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
