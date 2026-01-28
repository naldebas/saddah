// src/modules/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'جلب إحصائيات لوحة التحكم' })
  @ApiResponse({ status: 200, description: 'إحصائيات عامة' })
  async getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getStats(tenantId);
  }

  @Get('deals-by-stage')
  @ApiOperation({ summary: 'جلب الصفقات حسب المرحلة' })
  @ApiResponse({ status: 200, description: 'الصفقات مجمعة حسب المرحلة' })
  async getDealsByStage(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getDealsByStage(tenantId);
  }

  @Get('leads-by-source')
  @ApiOperation({ summary: 'جلب العملاء المحتملين حسب المصدر' })
  @ApiResponse({ status: 200, description: 'العملاء المحتملين مجمعين حسب المصدر' })
  async getLeadsBySource(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getLeadsBySource(tenantId);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'جلب الأنشطة الأخيرة' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة الأنشطة الأخيرة' })
  async getRecentActivities(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivities(
      tenantId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('sales-performance')
  @ApiOperation({ summary: 'جلب أداء المبيعات' })
  @ApiResponse({ status: 200, description: 'أداء فريق المبيعات' })
  async getSalesPerformance(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getSalesPerformance(tenantId);
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'جلب الإيرادات الشهرية' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'الإيرادات الشهرية' })
  async getMonthlyRevenue(
    @CurrentUser('tenantId') tenantId: string,
    @Query('months') months?: string,
  ) {
    return this.dashboardService.getMonthlyRevenue(
      tenantId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('upcoming-activities')
  @ApiOperation({ summary: 'جلب الأنشطة القادمة' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة الأنشطة القادمة' })
  async getUpcomingActivities(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getUpcomingActivities(
      tenantId,
      userId,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('widgets')
  @ApiOperation({ summary: 'جلب جميع بيانات الويدجات' })
  @ApiResponse({ status: 200, description: 'جميع بيانات لوحة التحكم' })
  async getAllWidgets(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const [
      stats,
      dealsByStage,
      leadsBySource,
      recentActivities,
      salesPerformance,
      monthlyRevenue,
      upcomingActivities,
    ] = await Promise.all([
      this.dashboardService.getStats(tenantId),
      this.dashboardService.getDealsByStage(tenantId),
      this.dashboardService.getLeadsBySource(tenantId),
      this.dashboardService.getRecentActivities(tenantId, 5),
      this.dashboardService.getSalesPerformance(tenantId),
      this.dashboardService.getMonthlyRevenue(tenantId, 6),
      this.dashboardService.getUpcomingActivities(tenantId, userId, 5),
    ]);

    return {
      stats,
      dealsByStage,
      leadsBySource,
      recentActivities,
      salesPerformance,
      monthlyRevenue,
      upcomingActivities,
    };
  }
}
