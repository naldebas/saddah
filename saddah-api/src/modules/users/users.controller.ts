// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto, ChangePasswordDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';
import { AuthenticatedUser } from '@/modules/auth/interfaces/jwt-payload.interface';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'الحصول على قائمة المستخدمين' })
  @ApiResponse({ status: 200, description: 'قائمة المستخدمين' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'الحصول على الملف الشخصي الحالي' })
  @ApiResponse({ status: 200, description: 'الملف الشخصي' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'تحديث الملف الشخصي' })
  @ApiResponse({ status: 200, description: 'تم تحديث الملف الشخصي' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'تغيير كلمة المرور' })
  @ApiResponse({ status: 200, description: 'تم تغيير كلمة المرور' })
  @ApiResponse({ status: 400, description: 'كلمة المرور غير صحيحة' })
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get('team/dashboard')
  @ApiOperation({ summary: 'لوحة تحكم الفريق (لمدير المبيعات)' })
  @ApiResponse({ status: 200, description: 'إحصائيات الفريق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  getTeamDashboard(@CurrentUser() user: AuthenticatedUser) {
    // Only sales managers and admins can view team dashboard
    if (!['admin', 'manager', 'sales_manager'].includes(user.role)) {
      throw new ForbiddenException('غير مصرح لك بعرض لوحة تحكم الفريق');
    }
    return this.usersService.getTeamDashboard(user.tenantId, user.id);
  }

  @Get('managers/list')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'قائمة المدراء (لتعيين الفريق)' })
  @ApiResponse({ status: 200, description: 'قائمة المدراء' })
  getManagers(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.getManagers(tenantId);
  }

  @Get(':id')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'الحصول على مستخدم محدد' })
  @ApiResponse({ status: 200, description: 'بيانات المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'إنشاء مستخدم جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المستخدم' })
  @ApiResponse({ status: 409, description: 'البريد الإلكتروني مستخدم' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'تحديث مستخدم' })
  @ApiResponse({ status: 200, description: 'تم تحديث المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  @ApiOperation({ summary: 'حذف مستخدم' })
  @ApiResponse({ status: 200, description: 'تم حذف المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(tenantId, id);
  }
}
