// src/modules/conversations/conversations.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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

import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto, AssignConversationDto, CloseConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto, QueryMessagesDto } from './dto/query-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';

@ApiTags('Conversations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @RequirePermission('conversations.create')
  @ApiOperation({ summary: 'إنشاء محادثة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المحادثة بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('conversations.view')
  @ApiOperation({ summary: 'جلب قائمة المحادثات' })
  @ApiResponse({ status: 200, description: 'قائمة المحادثات' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.findAll(tenantId, query);
  }

  @Get('my')
  @ApiOperation({ summary: 'جلب المحادثات المعينة لي' })
  @ApiResponse({ status: 200, description: 'قائمة محادثاتي' })
  getMyConversations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.getMyConversations(tenantId, userId, query);
  }

  @Get('statistics')
  @RequirePermission('conversations.view')
  @ApiOperation({ summary: 'جلب إحصائيات المحادثات' })
  @ApiResponse({ status: 200, description: 'إحصائيات المحادثات' })
  getStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.conversationsService.getStatistics(tenantId);
  }

  @Get('unassigned')
  @RequirePermission('conversations.view')
  @ApiOperation({ summary: 'جلب المحادثات غير المعينة' })
  @ApiResponse({ status: 200, description: 'قائمة المحادثات غير المعينة' })
  getUnassigned(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.findAll(tenantId, { ...query, unassignedOnly: true });
  }

  @Get(':id')
  @RequirePermission('conversations.view')
  @ApiOperation({ summary: 'جلب محادثة محددة' })
  @ApiResponse({ status: 200, description: 'بيانات المحادثة' })
  @ApiResponse({ status: 404, description: 'المحادثة غير موجودة' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'تحديث محادثة' })
  @ApiResponse({ status: 200, description: 'تم تحديث المحادثة بنجاح' })
  @ApiResponse({ status: 404, description: 'المحادثة غير موجودة' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(tenantId, id, dto);
  }

  @Post(':id/assign')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'تعيين محادثة لمستخدم' })
  @ApiResponse({ status: 200, description: 'تم تعيين المحادثة بنجاح' })
  @ApiResponse({ status: 404, description: 'المحادثة أو المستخدم غير موجود' })
  assign(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(tenantId, id, dto.assignedToId);
  }

  @Post(':id/take')
  @ApiOperation({ summary: 'استلام المحادثة (تعيينها لنفسي)' })
  @ApiResponse({ status: 200, description: 'تم استلام المحادثة بنجاح' })
  take(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.assign(tenantId, id, userId);
  }

  @Post(':id/close')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'إغلاق محادثة' })
  @ApiResponse({ status: 200, description: 'تم إغلاق المحادثة بنجاح' })
  close(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseConversationDto,
  ) {
    return this.conversationsService.close(tenantId, id, dto);
  }

  @Post(':id/reopen')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'إعادة فتح محادثة مغلقة' })
  @ApiResponse({ status: 200, description: 'تم إعادة فتح المحادثة بنجاح' })
  reopen(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.reopen(tenantId, id);
  }

  @Post(':id/link-contact')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'ربط المحادثة بجهة اتصال' })
  @ApiResponse({ status: 200, description: 'تم ربط المحادثة بجهة الاتصال بنجاح' })
  linkToContact(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.conversationsService.linkToContact(tenantId, id, contactId);
  }

  // Messages endpoints
  @Get(':id/messages')
  @RequirePermission('conversations.view')
  @ApiOperation({ summary: 'جلب رسائل المحادثة' })
  @ApiResponse({ status: 200, description: 'قائمة الرسائل' })
  getMessages(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.conversationsService.getMessages(tenantId, id, query);
  }

  @Post(':id/messages')
  @RequirePermission('conversations.edit')
  @ApiOperation({ summary: 'إرسال رسالة في المحادثة' })
  @ApiResponse({ status: 201, description: 'تم إرسال الرسالة بنجاح' })
  sendMessage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(tenantId, id, dto);
  }
}
