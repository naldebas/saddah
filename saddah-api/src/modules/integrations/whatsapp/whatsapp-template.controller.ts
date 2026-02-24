// src/modules/integrations/whatsapp/whatsapp-template.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  WhatsAppTemplateService,
  TemplateCategory,
  TemplateStatus,
  CreateTemplateDto,
  TemplateResponse,
} from './whatsapp-template.service';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

@ApiTags('WhatsApp Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/templates')
export class WhatsAppTemplateController {
  constructor(private readonly templateService: WhatsAppTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all WhatsApp templates' })
  @ApiQuery({ name: 'status', required: false, enum: TemplateStatus })
  @ApiQuery({ name: 'category', required: false, enum: TemplateCategory })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async getTemplates(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: TemplateStatus,
    @Query('category') category?: TemplateCategory,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ templates: TemplateResponse[]; total: number }> {
    return this.templateService.getTemplates(user.tenantId, {
      status,
      category,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available template categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  getCategories(): { categories: { value: string; label: string }[] } {
    return {
      categories: [
        { value: TemplateCategory.MARKETING, label: 'تسويقي' },
        { value: TemplateCategory.UTILITY, label: 'خدمي' },
        { value: TemplateCategory.AUTHENTICATION, label: 'مصادقة' },
      ],
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') templateId: string,
  ): Promise<TemplateResponse> {
    return this.templateService.getTemplate(user.tenantId, templateId);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview a template with sample variables' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Preview generated' })
  async previewTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') templateId: string,
    @Query() variables: Record<string, string>,
  ): Promise<{
    header?: string;
    body: string;
    footer?: string;
    requiredVariables: string[];
  }> {
    const template = await this.templateService.getTemplate(user.tenantId, templateId);
    const preview = this.templateService.generatePreview(template, variables);
    const requiredVariables = this.templateService.getRequiredVariables(template);

    return {
      ...preview,
      requiredVariables,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new WhatsApp template' })
  @ApiResponse({ status: 201, description: 'Template created and submitted for approval' })
  @ApiResponse({ status: 400, description: 'Invalid template data' })
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTemplateDto,
  ): Promise<TemplateResponse> {
    return this.templateService.createTemplate(user.tenantId, dto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync templates from WhatsApp API' })
  @ApiResponse({
    status: 200,
    description: 'Templates synced',
    schema: {
      type: 'object',
      properties: {
        synced: { type: 'number' },
        added: { type: 'number' },
        updated: { type: 'number' },
      },
    },
  })
  async syncTemplates(
    @CurrentUser() user: AuthUser,
  ): Promise<{ synced: number; added: number; updated: number }> {
    return this.templateService.syncTemplates(user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') templateId: string,
  ): Promise<void> {
    await this.templateService.deleteTemplate(user.tenantId, templateId);
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Get template by name (for sending)' })
  @ApiParam({ name: 'name', description: 'Template name' })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateByName(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Query('language') language?: string,
  ): Promise<TemplateResponse | { found: false }> {
    const template = await this.templateService.getTemplateByName(
      user.tenantId,
      name,
      language,
    );

    if (!template) {
      return { found: false };
    }

    return template;
  }
}
