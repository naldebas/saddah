// src/modules/exports/exports.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService, ExportOptions, CsvExportResult } from './exports.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Exports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('contacts')
  @RequirePermission('contacts.view')
  @ApiOperation({ summary: 'تصدير جهات الاتصال' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  @ApiResponse({ status: 200, description: 'بيانات التصدير' })
  async exportContacts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const options: ExportOptions = { format };
    const result = await this.exportsService.exportContacts(tenantId, options);

    if (format === 'json') {
      return res.json(result);
    }

    const csvResult = result as CsvExportResult;
    res.setHeader('Content-Type', csvResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${csvResult.filename}"`);
    return res.send(csvResult.data);
  }

  @Get('deals')
  @RequirePermission('deals.view')
  @ApiOperation({ summary: 'تصدير الصفقات' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  @ApiResponse({ status: 200, description: 'بيانات التصدير' })
  async exportDeals(
    @CurrentUser('tenantId') tenantId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const options: ExportOptions = { format };
    const result = await this.exportsService.exportDeals(tenantId, options);

    if (format === 'json') {
      return res.json(result);
    }

    const csvResult = result as CsvExportResult;
    res.setHeader('Content-Type', csvResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${csvResult.filename}"`);
    return res.send(csvResult.data);
  }

  @Get('companies')
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'تصدير الشركات' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  @ApiResponse({ status: 200, description: 'بيانات التصدير' })
  async exportCompanies(
    @CurrentUser('tenantId') tenantId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const options: ExportOptions = { format };
    const result = await this.exportsService.exportCompanies(tenantId, options);

    if (format === 'json') {
      return res.json(result);
    }

    const csvResult = result as CsvExportResult;
    res.setHeader('Content-Type', csvResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${csvResult.filename}"`);
    return res.send(csvResult.data);
  }

  @Get('leads')
  @RequirePermission('leads.view')
  @ApiOperation({ summary: 'تصدير العملاء المحتملين' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  @ApiResponse({ status: 200, description: 'بيانات التصدير' })
  async exportLeads(
    @CurrentUser('tenantId') tenantId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const options: ExportOptions = { format };
    const result = await this.exportsService.exportLeads(tenantId, options);

    if (format === 'json') {
      return res.json(result);
    }

    const csvResult = result as CsvExportResult;
    res.setHeader('Content-Type', csvResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${csvResult.filename}"`);
    return res.send(csvResult.data);
  }
}
