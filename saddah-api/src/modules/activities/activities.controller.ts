// src/modules/activities/activities.controller.ts
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
  ApiQuery,
} from '@nestjs/swagger';

import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Activities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @RequirePermission('activities.create')
  @ApiOperation({ summary: 'إنشاء نشاط جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء النشاط بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(tenantId, userId, dto);
  }

  @Get()
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'الحصول على قائمة الأنشطة' })
  @ApiResponse({ status: 200, description: 'قائمة الأنشطة' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesService.findAll(tenantId, query);
  }

  @Get('upcoming')
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'الحصول على الأنشطة القادمة والمتأخرة' })
  @ApiResponse({ status: 200, description: 'قائمة الأنشطة القادمة' })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUpcoming(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('mine') mine?: string,
    @Query('limit') limit?: string,
  ) {
    const onlyMine = mine === 'true';
    return this.activitiesService.getUpcoming(
      tenantId,
      onlyMine ? userId : undefined,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('statistics')
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'الحصول على إحصائيات الأنشطة' })
  @ApiResponse({ status: 200, description: 'إحصائيات الأنشطة' })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  getStatistics(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('mine') mine?: string,
  ) {
    const onlyMine = mine === 'true';
    return this.activitiesService.getStatistics(
      tenantId,
      onlyMine ? userId : undefined,
    );
  }

  @Get('timeline')
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'الحصول على الجدول الزمني للأنشطة' })
  @ApiResponse({ status: 200, description: 'الجدول الزمني' })
  @ApiQuery({ name: 'contactId', required: false })
  @ApiQuery({ name: 'dealId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTimeline(
    @CurrentUser('tenantId') tenantId: string,
    @Query('contactId') contactId?: string,
    @Query('dealId') dealId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.getTimeline(tenantId, {
      contactId,
      dealId,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @RequirePermission('activities.view')
  @ApiOperation({ summary: 'الحصول على نشاط محدد' })
  @ApiResponse({ status: 200, description: 'بيانات النشاط' })
  @ApiResponse({ status: 404, description: 'النشاط غير موجود' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('activities.edit')
  @ApiOperation({ summary: 'تحديث نشاط' })
  @ApiResponse({ status: 200, description: 'تم تحديث النشاط بنجاح' })
  @ApiResponse({ status: 404, description: 'النشاط غير موجود' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(tenantId, id, dto);
  }

  @Patch(':id/complete')
  @RequirePermission('activities.edit')
  @ApiOperation({ summary: 'إكمال نشاط' })
  @ApiResponse({ status: 200, description: 'تم إكمال النشاط بنجاح' })
  @ApiResponse({ status: 404, description: 'النشاط غير موجود' })
  complete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteActivityDto,
  ) {
    return this.activitiesService.complete(tenantId, id, dto);
  }

  @Patch(':id/uncomplete')
  @RequirePermission('activities.edit')
  @ApiOperation({ summary: 'إلغاء إكمال نشاط' })
  @ApiResponse({ status: 200, description: 'تم إلغاء إكمال النشاط بنجاح' })
  @ApiResponse({ status: 404, description: 'النشاط غير موجود' })
  uncomplete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.uncomplete(tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('activities.delete')
  @ApiOperation({ summary: 'حذف نشاط' })
  @ApiResponse({ status: 200, description: 'تم حذف النشاط بنجاح' })
  @ApiResponse({ status: 404, description: 'النشاط غير موجود' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.remove(tenantId, id);
  }
}
