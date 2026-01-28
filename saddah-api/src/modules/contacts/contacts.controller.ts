// src/modules/contacts/contacts.controller.ts
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

import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import { BulkDeleteDto, BulkAssignDto, BulkTagDto, BulkMoveToCompanyDto } from './dto/bulk-operations.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Contacts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermission('contacts.create')
  @ApiOperation({ summary: 'إنشاء جهة اتصال جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء جهة الاتصال بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(tenantId, userId, dto);
  }

  @Get()
  @RequirePermission('contacts.view')
  @ApiOperation({ summary: 'الحصول على قائمة جهات الاتصال' })
  @ApiResponse({ status: 200, description: 'قائمة جهات الاتصال' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryContactsDto,
  ) {
    return this.contactsService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermission('contacts.view')
  @ApiOperation({ summary: 'الحصول على جهة اتصال محددة' })
  @ApiResponse({ status: 200, description: 'بيانات جهة الاتصال' })
  @ApiResponse({ status: 404, description: 'جهة الاتصال غير موجودة' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contactsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('contacts.edit')
  @ApiOperation({ summary: 'تحديث جهة اتصال' })
  @ApiResponse({ status: 200, description: 'تم تحديث جهة الاتصال بنجاح' })
  @ApiResponse({ status: 404, description: 'جهة الاتصال غير موجودة' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('contacts.delete')
  @ApiOperation({ summary: 'حذف جهة اتصال' })
  @ApiResponse({ status: 200, description: 'تم حذف جهة الاتصال بنجاح' })
  @ApiResponse({ status: 404, description: 'جهة الاتصال غير موجودة' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contactsService.remove(tenantId, id);
  }

  // Bulk operations
  @Post('bulk/delete')
  @RequirePermission('contacts.delete')
  @ApiOperation({ summary: 'حذف مجموعة من جهات الاتصال' })
  @ApiResponse({ status: 200, description: 'تم حذف جهات الاتصال بنجاح' })
  bulkDelete(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BulkDeleteDto,
  ) {
    return this.contactsService.bulkDelete(tenantId, dto.ids);
  }

  @Post('bulk/assign')
  @RequirePermission('contacts.edit')
  @ApiOperation({ summary: 'تعيين مسؤول لمجموعة من جهات الاتصال' })
  @ApiResponse({ status: 200, description: 'تم تعيين المسؤول بنجاح' })
  bulkAssign(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BulkAssignDto,
  ) {
    return this.contactsService.bulkAssign(tenantId, dto.ids, dto.ownerId);
  }

  @Post('bulk/tags')
  @RequirePermission('contacts.edit')
  @ApiOperation({ summary: 'إضافة وسوم لمجموعة من جهات الاتصال' })
  @ApiResponse({ status: 200, description: 'تم إضافة الوسوم بنجاح' })
  bulkAddTags(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BulkTagDto,
  ) {
    return this.contactsService.bulkAddTags(tenantId, dto.ids, dto.tags, dto.replace);
  }

  @Post('bulk/move-to-company')
  @RequirePermission('contacts.edit')
  @ApiOperation({ summary: 'نقل مجموعة من جهات الاتصال إلى شركة' })
  @ApiResponse({ status: 200, description: 'تم نقل جهات الاتصال بنجاح' })
  bulkMoveToCompany(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BulkMoveToCompanyDto,
  ) {
    return this.contactsService.bulkMoveToCompany(tenantId, dto.ids, dto.companyId);
  }
}
