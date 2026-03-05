// src/modules/deals/deals.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { CloseDealDto } from './dto/close-deal.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Deals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @RequirePermission('deals.create')
  @ApiOperation({ summary: 'إنشاء صفقة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الصفقة بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealsService.create(tenantId, userId, dto);
  }

  @Get()
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على قائمة الصفقات' })
  @ApiResponse({ status: 200, description: 'قائمة الصفقات' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: QueryDealsDto,
  ) {
    return this.dealsService.findAll(tenantId, userId, userRole, query);
  }

  @Get('statistics')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على إحصائيات الصفقات' })
  @ApiResponse({ status: 200, description: 'إحصائيات الصفقات' })
  getStatistics(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.dealsService.getStatistics(tenantId, userId, userRole, pipelineId);
  }

  @Get('kanban/:pipelineId')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على عرض كانبان للصفقات' })
  @ApiResponse({ status: 200, description: 'عرض كانبان' })
  getKanbanBoard(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.dealsService.getKanbanBoard(tenantId, pipelineId, userId, userRole);
  }

  @Get(':id')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'الحصول على صفقة محددة' })
  @ApiResponse({ status: 200, description: 'بيانات الصفقة' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dealsService.findOne(tenantId, id, userId, userRole);
  }

  @Patch(':id')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'تحديث صفقة' })
  @ApiResponse({ status: 200, description: 'تم تحديث الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(tenantId, id, dto, userId, userRole);
  }

  @Patch(':id/move')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'نقل صفقة إلى مرحلة أخرى' })
  @ApiResponse({ status: 200, description: 'تم نقل الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  moveStage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveDealDto,
  ) {
    return this.dealsService.moveStage(tenantId, id, dto, userId, userRole);
  }

  @Patch(':id/close')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'إغلاق صفقة (ربح/خسارة)' })
  @ApiResponse({ status: 200, description: 'تم إغلاق الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  closeDeal(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseDealDto,
  ) {
    return this.dealsService.closeDeal(tenantId, id, dto, userId, userRole);
  }

  @Patch(':id/reopen')
  @RequirePermission('deals.edit')
  @ApiOperation({ summary: 'إعادة فتح صفقة مغلقة' })
  @ApiResponse({ status: 200, description: 'تم إعادة فتح الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  reopenDeal(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dealsService.reopenDeal(tenantId, id, userId, userRole);
  }

  @Delete(':id')
  @RequirePermission('deals.delete')
  @ApiOperation({ summary: 'حذف صفقة' })
  @ApiResponse({ status: 200, description: 'تم حذف الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dealsService.remove(tenantId, id, userId, userRole);
  }
}
