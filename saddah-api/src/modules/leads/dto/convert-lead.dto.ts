import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConvertLeadDto {
  @ApiPropertyOptional({ description: 'معرف الشركة لربط جهة الاتصال بها' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'معرف مسار المبيعات للصفقة الجديدة',
    example: 'pipeline-uuid',
  })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'عنوان الصفقة', example: 'فيلا حي الملقا' })
  @IsOptional()
  @IsString()
  dealTitle?: string;
}
