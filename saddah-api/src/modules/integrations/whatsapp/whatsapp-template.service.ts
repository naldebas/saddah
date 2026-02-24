// src/modules/integrations/whatsapp/whatsapp-template.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppTemplate } from '@prisma/client';
import { WhatsAppConfigService } from '../../../modules/settings/whatsapp-config.service';

/**
 * Template category
 */
export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

/**
 * Template status
 */
export enum TemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Template component types
 */
export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
  text: string;
  phone_number?: string;
  url?: string;
  example?: string[];
}

/**
 * DTO for creating a template
 */
export interface CreateTemplateDto {
  name: string;
  language?: string;
  category: TemplateCategory;
  components: WhatsAppTemplateComponent[];
}

/**
 * DTO for template response
 */
export interface TemplateResponse {
  id: string;
  tenantId: string;
  externalId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: WhatsAppTemplateComponent[];
  headerText?: string;
  bodyText: string;
  footerText?: string;
  variableCount: number;
  qualityScore?: string;
  rejectionReason?: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly whatsAppConfigService: WhatsAppConfigService,
  ) {}

  // ============================================
  // TEMPLATE CRUD
  // ============================================

  /**
   * Get all templates for a tenant
   */
  async getTemplates(
    tenantId: string,
    options: {
      status?: TemplateStatus;
      category?: TemplateCategory;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ templates: TemplateResponse[]; total: number }> {
    const { status, category, search, limit = 50, offset = 0 } = options;

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bodyText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.whatsAppTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.whatsAppTemplate.count({ where }),
    ]);

    return {
      templates: templates.map((t) => this.toResponse(t)),
      total,
    };
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(tenantId: string, templateId: string): Promise<TemplateResponse> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.toResponse(template);
  }

  /**
   * Get template by name (for sending)
   */
  async getTemplateByName(
    tenantId: string,
    name: string,
    language?: string,
  ): Promise<TemplateResponse | null> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        tenantId,
        name,
        language: language || 'ar',
        status: TemplateStatus.APPROVED,
        isActive: true,
      },
    });

    return template ? this.toResponse(template) : null;
  }

  /**
   * Create a new template (submit for approval)
   */
  async createTemplate(
    tenantId: string,
    dto: CreateTemplateDto,
  ): Promise<TemplateResponse> {
    // Validate template name (WhatsApp naming rules)
    if (!/^[a-z0-9_]+$/.test(dto.name)) {
      throw new BadRequestException(
        'Template name must be lowercase, alphanumeric with underscores only',
      );
    }

    // Check for duplicate
    const existing = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        tenantId,
        name: dto.name,
        language: dto.language || 'ar',
      },
    });

    if (existing) {
      throw new BadRequestException('Template with this name already exists');
    }

    // Extract text content from components
    const { headerText, bodyText, footerText, variableCount } =
      this.extractTextContent(dto.components);

    // Submit to WhatsApp API
    const externalId = await this.submitTemplateToWhatsApp(tenantId, dto);

    // Save to database
    const template = await this.prisma.whatsAppTemplate.create({
      data: {
        tenantId,
        externalId: externalId || `local_${Date.now()}`,
        name: dto.name,
        language: dto.language || 'ar',
        category: dto.category,
        status: externalId ? TemplateStatus.PENDING : TemplateStatus.APPROVED,
        components: dto.components as any,
        headerText,
        bodyText,
        footerText,
        variableCount,
      },
    });

    this.logger.log(`Created template ${dto.name} for tenant ${tenantId}`);

    return this.toResponse(template);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Delete from WhatsApp API if it has an external ID
    if (template.externalId && !template.externalId.startsWith('local_')) {
      await this.deleteTemplateFromWhatsApp(tenantId, template.name);
    }

    // Soft delete
    await this.prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    this.logger.log(`Deleted template ${template.name} for tenant ${tenantId}`);
  }

  // ============================================
  // SYNC WITH WHATSAPP
  // ============================================

  /**
   * Sync templates from WhatsApp API
   */
  async syncTemplates(tenantId: string): Promise<{
    synced: number;
    added: number;
    updated: number;
  }> {
    this.logger.log(`Syncing templates for tenant ${tenantId}`);

    const credentials = await this.whatsAppConfigService.getDecryptedCredentials(tenantId);

    if (!credentials?.meta) {
      this.logger.warn(`No Meta credentials for tenant ${tenantId}, skipping sync`);
      return { synced: 0, added: 0, updated: 0 };
    }

    try {
      // Fetch templates from Meta API
      const templates = await this.fetchTemplatesFromMeta(
        credentials.meta.businessAccountId,
        credentials.meta.token,
      );

      let added = 0;
      let updated = 0;

      for (const template of templates) {
        const existing = await this.prisma.whatsAppTemplate.findFirst({
          where: {
            tenantId,
            name: template.name,
            language: template.language,
          },
        });

        const { headerText, bodyText, footerText, variableCount } =
          this.extractTextContent(template.components);

        if (existing) {
          // Update existing template
          await this.prisma.whatsAppTemplate.update({
            where: { id: existing.id },
            data: {
              externalId: template.id,
              status: template.status,
              components: template.components as any,
              headerText,
              bodyText,
              footerText,
              variableCount,
              qualityScore: template.quality_score?.score,
              rejectionReason: template.rejected_reason,
              lastSyncedAt: new Date(),
            },
          });
          updated++;
        } else {
          // Create new template
          await this.prisma.whatsAppTemplate.create({
            data: {
              tenantId,
              externalId: template.id,
              name: template.name,
              language: template.language,
              category: template.category,
              status: template.status,
              components: template.components as any,
              headerText,
              bodyText,
              footerText,
              variableCount,
              qualityScore: template.quality_score?.score,
              rejectionReason: template.rejected_reason,
              lastSyncedAt: new Date(),
            },
          });
          added++;
        }
      }

      this.logger.log(
        `Synced ${templates.length} templates: ${added} added, ${updated} updated`,
      );

      return { synced: templates.length, added, updated };
    } catch (error: any) {
      this.logger.error(`Failed to sync templates: ${error.message}`);
      throw new BadRequestException(`Failed to sync templates: ${error.message}`);
    }
  }

  // ============================================
  // TEMPLATE PREVIEW
  // ============================================

  /**
   * Generate preview of template with sample data
   */
  generatePreview(
    template: TemplateResponse,
    variables: Record<string, string> = {},
  ): {
    header?: string;
    body: string;
    footer?: string;
  } {
    let header = template.headerText;
    let body = template.bodyText;
    let footer = template.footerText;

    // Replace variables {{1}}, {{2}}, etc.
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (header) {
        header = header.replace(placeholder, value);
      }
      body = body.replace(placeholder, value);
      if (footer) {
        footer = footer.replace(placeholder, value);
      }
    }

    return { header, body, footer };
  }

  /**
   * Get required variables for a template
   */
  getRequiredVariables(template: TemplateResponse): string[] {
    const variables: string[] = [];
    const regex = /\{\{(\d+)\}\}/g;

    const text = [
      template.headerText,
      template.bodyText,
      template.footerText,
    ].filter(Boolean).join(' ');

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables.sort((a, b) => parseInt(a) - parseInt(b));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Submit template to WhatsApp Business API
   */
  private async submitTemplateToWhatsApp(
    tenantId: string,
    dto: CreateTemplateDto,
  ): Promise<string | null> {
    const credentials = await this.whatsAppConfigService.getDecryptedCredentials(tenantId);

    if (!credentials?.meta) {
      this.logger.warn(`No Meta credentials, creating local template`);
      return null;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.meta.businessAccountId}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.meta.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: dto.name,
            language: dto.language || 'ar',
            category: dto.category,
            components: dto.components,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create template');
      }

      return data.id;
    } catch (error: any) {
      this.logger.error(`Failed to submit template to WhatsApp: ${error.message}`);
      throw new BadRequestException(`WhatsApp API error: ${error.message}`);
    }
  }

  /**
   * Delete template from WhatsApp Business API
   */
  private async deleteTemplateFromWhatsApp(
    tenantId: string,
    templateName: string,
  ): Promise<void> {
    const credentials = await this.whatsAppConfigService.getDecryptedCredentials(tenantId);

    if (!credentials?.meta) {
      return;
    }

    try {
      await fetch(
        `https://graph.facebook.com/v18.0/${credentials.meta.businessAccountId}/message_templates?name=${templateName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${credentials.meta.token}`,
          },
        },
      );
    } catch (error: any) {
      this.logger.error(`Failed to delete template from WhatsApp: ${error.message}`);
    }
  }

  /**
   * Fetch templates from Meta API
   */
  private async fetchTemplatesFromMeta(
    businessAccountId: string,
    accessToken: string,
  ): Promise<any[]> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch templates');
    }

    return data.data || [];
  }

  /**
   * Extract text content from template components
   */
  private extractTextContent(components: WhatsAppTemplateComponent[]): {
    headerText?: string;
    bodyText: string;
    footerText?: string;
    variableCount: number;
  } {
    let headerText: string | undefined;
    let bodyText = '';
    let footerText: string | undefined;
    let variableCount = 0;

    for (const component of components) {
      if (component.type === 'HEADER' && component.text) {
        headerText = component.text;
        variableCount += (component.text.match(/\{\{\d+\}\}/g) || []).length;
      } else if (component.type === 'BODY' && component.text) {
        bodyText = component.text;
        variableCount += (component.text.match(/\{\{\d+\}\}/g) || []).length;
      } else if (component.type === 'FOOTER' && component.text) {
        footerText = component.text;
      }
    }

    return { headerText, bodyText, footerText, variableCount };
  }

  /**
   * Convert database model to response DTO
   */
  private toResponse(template: WhatsAppTemplate): TemplateResponse {
    return {
      id: template.id,
      tenantId: template.tenantId,
      externalId: template.externalId,
      name: template.name,
      language: template.language,
      category: template.category,
      status: template.status,
      components: template.components as unknown as WhatsAppTemplateComponent[],
      headerText: template.headerText || undefined,
      bodyText: template.bodyText,
      footerText: template.footerText || undefined,
      variableCount: template.variableCount,
      qualityScore: template.qualityScore || undefined,
      rejectionReason: template.rejectionReason || undefined,
      isActive: template.isActive,
      lastSyncedAt: template.lastSyncedAt || undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
