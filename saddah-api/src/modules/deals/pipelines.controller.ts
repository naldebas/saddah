// src/modules/deals/pipelines.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto, CreatePipelineStageDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Pipelines')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @RequirePermission('deals.create')
  @ApiOperation({ summary: 'إنشاء خط مبيعات جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء خط المبيعات بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.pipelinesService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على قائمة خطوط المبيعات' })
  @ApiResponse({ status: 200, description: 'قائمة خطوط المبيعات' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.findAll(tenantId);
  }

  @Get('default')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على خط المبيعات الافتراضي' })
  @ApiResponse({ status: 200, description: 'خط المبيعات الافتراضي' })
  findDefault(@CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.findDefault(tenantId);
  }

  @Get(':id')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على خط مبيعات محدد' })
  @ApiResponse({ status: 200, description: 'بيانات خط المبيعات' })
  @ApiResponse({ status: 404, description: 'خط المبيعات غير موجود' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pipelinesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'تحديث خط مبيعات' })
  @ApiResponse({ status: 200, description: 'تم تحديث خط المبيعات بنجاح' })
  @ApiResponse({ status: 404, description: 'خط المبيعات غير موجود' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('deals.delete')
  @ApiOperation({ summary: 'حذف خط مبيعات' })
  @ApiResponse({ status: 200, description: 'تم حذف خط المبيعات بنجاح' })
  @ApiResponse({ status: 404, description: 'خط المبيعات غير موجود' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pipelinesService.remove(tenantId, id);
  }

  // Stage management
  @Post(':id/stages')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'إضافة مرحلة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إضافة المرحلة بنجاح' })
  addStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreatePipelineStageDto,
  ) {
    return this.pipelinesService.addStage(tenantId, pipelineId, dto);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'تحديث مرحلة' })
  @ApiResponse({ status: 200, description: 'تم تحديث المرحلة بنجاح' })
  updateStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(tenantId, pipelineId, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermission('deals.delete')
  @ApiOperation({ summary: 'حذف مرحلة' })
  @ApiResponse({ status: 200, description: 'تم حذف المرحلة بنجاح' })
  removeStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.pipelinesService.removeStage(tenantId, pipelineId, stageId);
  }

  @Patch(':id/stages/reorder')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'إعادة ترتيب المراحل' })
  @ApiResponse({ status: 200, description: 'تم إعادة ترتيب المراحل بنجاح' })
  reorderStages(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Body() stageOrders: { id: string; order: number }[],
  ) {
    return this.pipelinesService.reorderStages(tenantId, pipelineId, stageOrders);
  }
}
