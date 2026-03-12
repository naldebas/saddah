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

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission('projects.create')
  @ApiOperation({ summary: 'إنشاء مشروع جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المشروع بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'الحصول على قائمة المشاريع' })
  @ApiResponse({ status: 200, description: 'قائمة المشاريع' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryProjectsDto,
  ) {
    return this.projectsService.findAll(tenantId, query);
  }

  @Get('statistics')
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'الحصول على إحصائيات المشاريع' })
  @ApiResponse({ status: 200, description: 'إحصائيات المشاريع' })
  getStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.projectsService.getStatistics(tenantId);
  }

  @Get('cities')
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'الحصول على قائمة المدن المتاحة' })
  @ApiResponse({ status: 200, description: 'قائمة المدن' })
  getCities(@CurrentUser('tenantId') tenantId: string) {
    return this.projectsService.getCities(tenantId);
  }

  @Get(':id')
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'الحصول على تفاصيل مشروع' })
  @ApiResponse({ status: 200, description: 'تفاصيل المشروع' })
  @ApiResponse({ status: 404, description: 'المشروع غير موجود' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('projects.edit')
  @ApiOperation({ summary: 'تحديث مشروع' })
  @ApiResponse({ status: 200, description: 'تم تحديث المشروع بنجاح' })
  @ApiResponse({ status: 404, description: 'المشروع غير موجود' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('projects.delete')
  @ApiOperation({ summary: 'حذف مشروع' })
  @ApiResponse({ status: 200, description: 'تم حذف المشروع بنجاح' })
  @ApiResponse({ status: 404, description: 'المشروع غير موجود' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.remove(tenantId, id);
  }
}
