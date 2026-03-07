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
  @RequirePermission('pipelines.create')
  @ApiOperation({ summary: 'إنشاء خط مبيعات جديد (للمسؤول فقط)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء خط المبيعات بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
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
  @RequirePermission('pipelines.edit')
  @ApiOperation({ summary: 'تحديث خط مبيعات (للمسؤول فقط)' })
  @ApiResponse({ status: 200, description: 'تم تحديث خط المبيعات بنجاح' })
  @ApiResponse({ status: 404, description: 'خط المبيعات غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('pipelines.delete')
  @ApiOperation({ summary: 'حذف خط مبيعات (للمسؤول فقط)' })
  @ApiResponse({ status: 200, description: 'تم حذف خط المبيعات بنجاح' })
  @ApiResponse({ status: 404, description: 'خط المبيعات غير موجود' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pipelinesService.remove(tenantId, id);
  }

  // Stage management - IMPORTANT: reorder must come before :stageId routes
  // All stage management is admin-only
  @Patch(':id/stages/reorder')
  @RequirePermission('pipelines.edit')
  @ApiOperation({ summary: 'إعادة ترتيب المراحل (للمسؤول فقط)' })
  @ApiResponse({ status: 200, description: 'تم إعادة ترتيب المراحل بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  reorderStages(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Body() stageOrders: { id: string; order: number }[],
  ) {
    return this.pipelinesService.reorderStages(tenantId, pipelineId, stageOrders);
  }

  @Post(':id/stages')
  @RequirePermission('pipelines.edit')
  @ApiOperation({ summary: 'إضافة مرحلة جديدة (للمسؤول فقط)' })
  @ApiResponse({ status: 201, description: 'تم إضافة المرحلة بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  addStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreatePipelineStageDto,
  ) {
    return this.pipelinesService.addStage(tenantId, pipelineId, dto);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermission('pipelines.edit')
  @ApiOperation({ summary: 'تحديث مرحلة (للمسؤول فقط)' })
  @ApiResponse({ status: 200, description: 'تم تحديث المرحلة بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  updateStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(tenantId, pipelineId, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermission('pipelines.delete')
  @ApiOperation({ summary: 'حذف مرحلة (للمسؤول فقط)' })
  @ApiResponse({ status: 200, description: 'تم حذف المرحلة بنجاح' })
  @ApiResponse({ status: 403, description: 'غير مصرح - للمسؤول فقط' })
  removeStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) pipelineId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.pipelinesService.removeStage(tenantId, pipelineId, stageId);
  }
}
