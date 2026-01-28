// src/modules/reports/reports.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ExportQueryDto } from './dto/report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'reports',
  version: '1',
})
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============================================
  // REPORTS
  // ============================================

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiResponse({ status: 200, description: 'Returns sales analytics' })
  async getSalesReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSalesReport(user.tenantId, query);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads report' })
  @ApiResponse({ status: 200, description: 'Returns leads analytics' })
  async getLeadsReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getLeadsReport(user.tenantId, query);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get activities report' })
  @ApiResponse({ status: 200, description: 'Returns activities analytics' })
  async getActivitiesReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getActivitiesReport(user.tenantId, query);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contacts report' })
  @ApiResponse({ status: 200, description: 'Returns contacts analytics' })
  async getContactsReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getContactsReport(user.tenantId, query);
  }

  // ============================================
  // EXPORTS
  // ============================================

  @Get('export/deals')
  @ApiOperation({ summary: 'Export deals to CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  async exportDeals(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportDeals(user.tenantId, query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=deals-${new Date().toISOString().split('T')[0]}.csv`);
    // Add BOM for Excel Arabic support
    res.send('\ufeff' + csv);
  }

  @Get('export/leads')
  @ApiOperation({ summary: 'Export leads to CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  async exportLeads(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportLeads(user.tenantId, query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv);
  }

  @Get('export/activities')
  @ApiOperation({ summary: 'Export activities to CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  async exportActivities(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportActivities(user.tenantId, query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=activities-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv);
  }
}
