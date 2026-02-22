// src/modules/companies/companies.controller.ts
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

import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @RequirePermission('companies.create')
  @ApiOperation({ summary: 'إنشاء شركة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الشركة بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(tenantId, userId, dto);
  }

  @Get()
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'الحصول على قائمة الشركات' })
  @ApiResponse({ status: 200, description: 'قائمة الشركات' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryCompaniesDto,
  ) {
    return this.companiesService.findAll(tenantId, query);
  }

  @Get('industries')
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'الحصول على قائمة القطاعات المتاحة' })
  @ApiResponse({ status: 200, description: 'قائمة القطاعات' })
  getIndustries(@CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.getIndustries(tenantId);
  }

  @Get('cities')
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'الحصول على قائمة المدن المتاحة' })
  @ApiResponse({ status: 200, description: 'قائمة المدن' })
  getCities(@CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.getCities(tenantId);
  }

  @Get(':id')
  @RequirePermission('companies.view')
  @ApiOperation({ summary: 'الحصول على شركة محددة' })
  @ApiResponse({ status: 200, description: 'بيانات الشركة' })
  @ApiResponse({ status: 404, description: 'الشركة غير موجودة' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companiesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('companies.edit')
  @ApiOperation({ summary: 'تحديث شركة' })
  @ApiResponse({ status: 200, description: 'تم تحديث الشركة بنجاح' })
  @ApiResponse({ status: 404, description: 'الشركة غير موجودة' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('companies.delete')
  @ApiOperation({ summary: 'حذف شركة' })
  @ApiResponse({ status: 200, description: 'تم حذف الشركة بنجاح' })
  @ApiResponse({ status: 404, description: 'الشركة غير موجودة' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companiesService.remove(tenantId, id);
  }
}
