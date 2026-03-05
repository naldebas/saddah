import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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

import { LeadsService } from './leads.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ScoreLeadDto } from './dto/score-lead.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Leads')
@ApiBearerAuth('access-token')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermission('leads.create')
  @ApiOperation({ summary: 'إنشاء عميل محتمل جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العميل المحتمل بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(tenantId, userId, dto);
  }

  @Get()
  @RequirePermission('leads.read')
  @ApiOperation({ summary: 'الحصول على قائمة العملاء المحتملين' })
  @ApiResponse({ status: 200, description: 'قائمة العملاء المحتملين' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: QueryLeadsDto,
  ) {
    return this.leadsService.findAll(tenantId, userId, userRole, query);
  }

  @Get('statistics')
  @RequirePermission('leads.read')
  @ApiOperation({ summary: 'الحصول على إحصائيات العملاء المحتملين' })
  @ApiResponse({ status: 200, description: 'إحصائيات العملاء المحتملين' })
  getStatistics(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.leadsService.getStatistics(tenantId, userId, userRole);
  }

  @Get(':id')
  @RequirePermission('leads.read')
  @ApiOperation({ summary: 'الحصول على عميل محتمل محدد' })
  @ApiResponse({ status: 200, description: 'بيانات العميل المحتمل' })
  @ApiResponse({ status: 404, description: 'العميل المحتمل غير موجود' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.findOne(tenantId, id, userId, userRole);
  }

  @Patch(':id')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'تحديث عميل محتمل' })
  @ApiResponse({ status: 200, description: 'تم تحديث العميل المحتمل بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل المحتمل غير موجود' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, id, dto, userId, userRole);
  }

  @Patch(':id/status/:status')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'تغيير حالة عميل محتمل' })
  @ApiResponse({ status: 200, description: 'تم تغيير الحالة بنجاح' })
  updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status') status: LeadStatus,
  ) {
    return this.leadsService.updateStatus(tenantId, id, status, userId, userRole);
  }

  @Patch(':id/score')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'تصنيف عميل محتمل' })
  @ApiResponse({ status: 200, description: 'تم تصنيف العميل المحتمل بنجاح' })
  score(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScoreLeadDto,
  ) {
    return this.leadsService.score(tenantId, id, dto, userId, userRole);
  }

  @Post(':id/convert')
  @RequirePermission('leads.update')
  @ApiOperation({ summary: 'تحويل عميل محتمل إلى جهة اتصال وصفقة' })
  @ApiResponse({ status: 200, description: 'تم تحويل العميل المحتمل بنجاح' })
  @ApiResponse({ status: 400, description: 'تم تحويل العميل المحتمل مسبقاً' })
  convert(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.leadsService.convert(tenantId, id, userId, userRole, dto);
  }

  @Delete(':id')
  @RequirePermission('leads.delete')
  @ApiOperation({ summary: 'حذف عميل محتمل' })
  @ApiResponse({ status: 200, description: 'تم حذف العميل المحتمل بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل المحتمل غير موجود' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.remove(tenantId, id, userId, userRole);
  }
}
