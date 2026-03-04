// src/modules/integrations/botpress/botpress-config.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionUtil } from '@/modules/settings/utils/encryption.util';
import {
  CreateBotpressConfigDto,
  UpdateBotpressConfigDto,
  BotpressConfigResponseDto,
} from './dto';
import { BotpressCredentials } from './interfaces';

@Injectable()
export class BotpressConfigService {
  private readonly logger = new Logger(BotpressConfigService.name);
  private readonly encryption: EncryptionUtil;
  private readonly baseUrl: string;
  private readonly botpressApiBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const encryptionSecret = this.configService.get<string>(
      'JWT_SECRET',
      'default-encryption-key-change-in-production',
    );
    this.encryption = new EncryptionUtil(encryptionSecret);
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    this.botpressApiBaseUrl = this.configService.get<string>(
      'BOTPRESS_API_BASE_URL',
      'https://api.botpress.cloud/v1',
    );
  }

  /**
   * Get Botpress configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<BotpressConfigResponseDto | null> {
    const config = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    return this.toResponseDto(config);
  }

  /**
   * Get raw config with decrypted credentials (for internal use)
   */
  async getConfigWithCredentials(
    tenantId: string,
  ): Promise<{ config: any; credentials: BotpressCredentials } | null> {
    const config = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    try {
      const credentials = this.encryption.decryptObject<BotpressCredentials>(config.credentials);
      return { config, credentials };
    } catch (error) {
      this.logger.error(`Failed to decrypt Botpress credentials for tenant ${tenantId}`);
      return null;
    }
  }

  /**
   * Find config by tenant ID (for services)
   */
  async findByTenant(tenantId: string) {
    return this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Create or update Botpress configuration
   */
  async upsertConfig(
    tenantId: string,
    userRole: string,
    dto: CreateBotpressConfigDto | UpdateBotpressConfigDto,
  ): Promise<BotpressConfigResponseDto> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can configure Botpress integration');
    }

    const existing = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    // Build credentials object
    const credentials: BotpressCredentials = {
      token: dto.credentials?.token || '',
      webhookSecret: dto.credentials?.webhookSecret || EncryptionUtil.generateWebhookSecret(),
    };

    // Encrypt credentials
    const encryptedCredentials = this.encryption.encryptObject(credentials);

    // Generate callback URL for this tenant
    const callbackUrl = `${this.baseUrl}/api/v1/webhooks/botpress/${tenantId}`;

    // Default webhook URL for Botpress
    const webhookUrl =
      dto.webhookUrl || `${this.botpressApiBaseUrl}/bots/${dto.botId}/conversations`;

    let config;
    if (existing) {
      config = await this.prisma.botpressConfig.update({
        where: { tenantId },
        data: {
          botId: dto.botId ?? existing.botId,
          workspaceId: dto.workspaceId ?? existing.workspaceId,
          credentials: dto.credentials ? encryptedCredentials : existing.credentials,
          webhookUrl: dto.webhookUrl ?? existing.webhookUrl,
          callbackUrl,
          autoCreateLead: dto.autoCreateLead ?? existing.autoCreateLead,
          autoConvertDeal: dto.autoConvertDeal ?? existing.autoConvertDeal,
          qualificationThreshold: dto.qualificationThreshold ?? existing.qualificationThreshold,
          defaultPipelineId: dto.defaultPipelineId ?? existing.defaultPipelineId,
          isVerified: dto.credentials ? false : existing.isVerified, // Reset if credentials changed
        },
      });
      this.logger.log(`Updated Botpress config for tenant ${tenantId}`);
    } else {
      if (!dto.botId || !dto.workspaceId || !dto.credentials?.token) {
        throw new BadRequestException(
          'Bot ID, Workspace ID, and token are required for new configuration',
        );
      }

      config = await this.prisma.botpressConfig.create({
        data: {
          tenantId,
          botId: dto.botId,
          workspaceId: dto.workspaceId,
          credentials: encryptedCredentials,
          webhookUrl,
          callbackUrl,
          isActive: false,
          isVerified: false,
          autoCreateLead: dto.autoCreateLead ?? true,
          autoConvertDeal: dto.autoConvertDeal ?? true,
          qualificationThreshold: dto.qualificationThreshold ?? 60,
          defaultPipelineId: dto.defaultPipelineId,
        },
      });
      this.logger.log(`Created Botpress config for tenant ${tenantId}`);
    }

    return this.toResponseDto(config);
  }

  /**
   * Activate Botpress integration
   */
  async activate(tenantId: string, userRole: string): Promise<BotpressConfigResponseDto> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can activate Botpress integration');
    }

    const config = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('Botpress configuration not found');
    }

    if (!config.isVerified) {
      throw new BadRequestException(
        'Cannot activate Botpress integration. Please test the connection first.',
      );
    }

    const updated = await this.prisma.botpressConfig.update({
      where: { tenantId },
      data: { isActive: true },
    });

    this.logger.log(`Activated Botpress integration for tenant ${tenantId}`);
    return this.toResponseDto(updated);
  }

  /**
   * Deactivate Botpress integration
   */
  async deactivate(tenantId: string, userRole: string): Promise<BotpressConfigResponseDto> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can deactivate Botpress integration');
    }

    const config = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('Botpress configuration not found');
    }

    const updated = await this.prisma.botpressConfig.update({
      where: { tenantId },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated Botpress integration for tenant ${tenantId}`);
    return this.toResponseDto(updated);
  }

  /**
   * Delete Botpress configuration
   */
  async deleteConfig(tenantId: string, userRole: string): Promise<void> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can delete Botpress configuration');
    }

    const config = await this.prisma.botpressConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('Botpress configuration not found');
    }

    // Delete associated conversations
    await this.prisma.botpressConversation.deleteMany({
      where: { tenantId },
    });

    await this.prisma.botpressConfig.delete({
      where: { tenantId },
    });

    this.logger.log(`Deleted Botpress config for tenant ${tenantId}`);
  }

  /**
   * Update verification status after test
   */
  async updateVerificationStatus(
    tenantId: string,
    isVerified: boolean,
  ): Promise<void> {
    await this.prisma.botpressConfig.update({
      where: { tenantId },
      data: {
        isVerified,
        lastTestedAt: new Date(),
      },
    });
  }

  /**
   * Convert to response DTO with masked credentials
   */
  private toResponseDto(config: any): BotpressConfigResponseDto {
    let maskedCredentials: Record<string, string> = {};

    try {
      const credentials = this.encryption.decryptObject<BotpressCredentials>(config.credentials);
      maskedCredentials = EncryptionUtil.maskCredentials(credentials);
    } catch {
      maskedCredentials = { error: 'Unable to decrypt credentials' };
    }

    return {
      id: config.id,
      tenantId: config.tenantId,
      botId: config.botId,
      workspaceId: config.workspaceId,
      webhookUrl: config.webhookUrl,
      callbackUrl: config.callbackUrl,
      isActive: config.isActive,
      isVerified: config.isVerified,
      autoCreateLead: config.autoCreateLead,
      autoConvertDeal: config.autoConvertDeal,
      qualificationThreshold: config.qualificationThreshold,
      defaultPipelineId: config.defaultPipelineId,
      lastTestedAt: config.lastTestedAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      maskedCredentials,
    };
  }
}
