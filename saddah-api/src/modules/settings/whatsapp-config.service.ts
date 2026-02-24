// src/modules/settings/whatsapp-config.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateWhatsAppConfigDto,
  WhatsAppConfigResponseDto,
  TestConnectionResultDto,
  WhatsAppProvider,
  TwilioCredentialsDto,
  MetaCredentialsDto,
} from './dto/whatsapp-config.dto';
import { EncryptionUtil } from './utils/encryption.util';

export interface DecryptedCredentials {
  twilio?: TwilioCredentialsDto;
  meta?: MetaCredentialsDto;
}

@Injectable()
export class WhatsAppConfigService {
  private readonly logger = new Logger(WhatsAppConfigService.name);
  private readonly encryption: EncryptionUtil;
  private readonly baseWebhookUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Use JWT secret as encryption key (should use dedicated key in production)
    const encryptionSecret = this.configService.get<string>(
      'JWT_SECRET',
      'default-encryption-key-change-in-production',
    );
    this.encryption = new EncryptionUtil(encryptionSecret);
    this.baseWebhookUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Get WhatsApp configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<WhatsAppConfigResponseDto | null> {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    return this.toResponseDto(config);
  }

  /**
   * Get decrypted credentials (for internal use only)
   */
  async getDecryptedCredentials(tenantId: string): Promise<DecryptedCredentials | null> {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    try {
      return this.encryption.decryptObject<DecryptedCredentials>(config.credentials);
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for tenant ${tenantId}`, error);
      return null;
    }
  }

  /**
   * Create or update WhatsApp configuration
   */
  async updateConfig(
    tenantId: string,
    userRole: string,
    dto: UpdateWhatsAppConfigDto,
  ): Promise<WhatsAppConfigResponseDto> {
    // Only admins can update WhatsApp config
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can update WhatsApp configuration');
    }

    // Validate credentials based on provider
    this.validateCredentials(dto);

    // Build credentials object
    const credentials: DecryptedCredentials = {};
    if (dto.provider === WhatsAppProvider.TWILIO && dto.twilioCredentials) {
      credentials.twilio = dto.twilioCredentials;
    } else if (dto.provider === WhatsAppProvider.META && dto.metaCredentials) {
      credentials.meta = dto.metaCredentials;
    }

    // Encrypt credentials
    const encryptedCredentials = this.encryption.encryptObject(credentials);

    // Check if config exists
    const existing = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    let config;
    if (existing) {
      // Update existing config
      config = await this.prisma.whatsAppConfig.update({
        where: { tenantId },
        data: {
          provider: dto.provider,
          phoneNumber: dto.phoneNumber,
          credentials: encryptedCredentials,
          isActive: dto.isActive ?? existing.isActive,
          isVerified: false, // Reset verification when credentials change
        },
      });
      this.logger.log(`Updated WhatsApp config for tenant ${tenantId}`);
    } else {
      // Create new config
      config = await this.prisma.whatsAppConfig.create({
        data: {
          tenantId,
          provider: dto.provider,
          phoneNumber: dto.phoneNumber,
          credentials: encryptedCredentials,
          webhookSecret: EncryptionUtil.generateWebhookSecret(),
          isActive: dto.isActive ?? false,
          isVerified: false,
        },
      });
      this.logger.log(`Created WhatsApp config for tenant ${tenantId}`);
    }

    return this.toResponseDto(config);
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(tenantId: string): Promise<TestConnectionResultDto> {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found');
    }

    const testedAt = new Date();

    try {
      const credentials = this.encryption.decryptObject<DecryptedCredentials>(
        config.credentials,
      );

      let success = false;
      let details: Record<string, any> = {};

      if (config.provider === WhatsAppProvider.TWILIO && credentials.twilio) {
        const result = await this.testTwilioConnection(credentials.twilio);
        success = result.success;
        details = result.details || {};
      } else if (config.provider === WhatsAppProvider.META && credentials.meta) {
        const result = await this.testMetaConnection(credentials.meta);
        success = result.success;
        details = result.details || {};
      } else {
        throw new BadRequestException('Invalid provider or missing credentials');
      }

      // Update verification status
      await this.prisma.whatsAppConfig.update({
        where: { tenantId },
        data: {
          isVerified: success,
          lastTestedAt: testedAt,
        },
      });

      return {
        success,
        details,
        testedAt,
      };
    } catch (error: any) {
      this.logger.error(`Connection test failed for tenant ${tenantId}`, error);

      // Update verification status
      await this.prisma.whatsAppConfig.update({
        where: { tenantId },
        data: {
          isVerified: false,
          lastTestedAt: testedAt,
        },
      });

      return {
        success: false,
        error: error.message || 'Connection test failed',
        testedAt,
      };
    }
  }

  /**
   * Rotate webhook secret
   */
  async rotateWebhookSecret(tenantId: string, userRole: string): Promise<string> {
    // Only admins can rotate webhook secrets
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can rotate webhook secrets');
    }

    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found');
    }

    const newSecret = EncryptionUtil.generateWebhookSecret();

    await this.prisma.whatsAppConfig.update({
      where: { tenantId },
      data: { webhookSecret: newSecret },
    });

    this.logger.log(`Rotated webhook secret for tenant ${tenantId}`);

    return newSecret;
  }

  /**
   * Toggle WhatsApp integration active status
   */
  async toggleActive(tenantId: string, userRole: string, isActive: boolean): Promise<WhatsAppConfigResponseDto> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can toggle WhatsApp status');
    }

    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found');
    }

    // Cannot activate if not verified
    if (isActive && !config.isVerified) {
      throw new BadRequestException(
        'Cannot activate WhatsApp integration. Please test the connection first.',
      );
    }

    const updated = await this.prisma.whatsAppConfig.update({
      where: { tenantId },
      data: { isActive },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Delete WhatsApp configuration
   */
  async deleteConfig(tenantId: string, userRole: string): Promise<void> {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Only admins can delete WhatsApp configuration');
    }

    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found');
    }

    await this.prisma.whatsAppConfig.delete({
      where: { tenantId },
    });

    this.logger.log(`Deleted WhatsApp config for tenant ${tenantId}`);
  }

  /**
   * Get webhook secret for verification
   */
  async getWebhookSecret(tenantId: string): Promise<string | null> {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { tenantId },
      select: { webhookSecret: true },
    });

    return config?.webhookSecret || null;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateCredentials(dto: UpdateWhatsAppConfigDto): void {
    if (dto.provider === WhatsAppProvider.TWILIO) {
      if (!dto.twilioCredentials) {
        throw new BadRequestException('Twilio credentials are required');
      }
      if (!dto.twilioCredentials.accountSid || !dto.twilioCredentials.authToken) {
        throw new BadRequestException('Twilio Account SID and Auth Token are required');
      }
    } else if (dto.provider === WhatsAppProvider.META) {
      if (!dto.metaCredentials) {
        throw new BadRequestException('Meta credentials are required');
      }
      if (!dto.metaCredentials.token || !dto.metaCredentials.phoneNumberId) {
        throw new BadRequestException('Meta token and Phone Number ID are required');
      }
    }
  }

  private async testTwilioConnection(
    credentials: TwilioCredentialsDto,
  ): Promise<{ success: boolean; details?: Record<string, any> }> {
    try {
      // Dynamic import to avoid bundling issues if Twilio not installed
      const twilio = await import('twilio');
      const client = twilio.default(credentials.accountSid, credentials.authToken);

      // Fetch account info to verify credentials
      const account = await client.api.accounts(credentials.accountSid).fetch();

      return {
        success: true,
        details: {
          accountName: account.friendlyName,
          accountStatus: account.status,
          accountType: account.type,
        },
      };
    } catch (error: any) {
      this.logger.error('Twilio connection test failed', error);
      throw new Error(`Twilio connection failed: ${error.message}`);
    }
  }

  private async testMetaConnection(
    credentials: MetaCredentialsDto,
  ): Promise<{ success: boolean; details?: Record<string, any> }> {
    try {
      // Test Meta API by fetching business profile
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Meta API request failed');
      }

      const data = await response.json();

      return {
        success: true,
        details: {
          phoneNumberId: data.id,
          displayPhoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
        },
      };
    } catch (error: any) {
      this.logger.error('Meta connection test failed', error);
      throw new Error(`Meta connection failed: ${error.message}`);
    }
  }

  private toResponseDto(config: any): WhatsAppConfigResponseDto {
    // Decrypt credentials to create masked version
    let maskedCredentials: Record<string, string> = {};
    try {
      const credentials = this.encryption.decryptObject<DecryptedCredentials>(
        config.credentials,
      );
      if (credentials.twilio) {
        maskedCredentials = EncryptionUtil.maskCredentials(credentials.twilio);
      } else if (credentials.meta) {
        maskedCredentials = EncryptionUtil.maskCredentials(credentials.meta);
      }
    } catch {
      maskedCredentials = { error: 'Unable to decrypt credentials' };
    }

    return {
      id: config.id,
      tenantId: config.tenantId,
      provider: config.provider as WhatsAppProvider,
      phoneNumber: config.phoneNumber || '',
      isActive: config.isActive,
      isVerified: config.isVerified,
      webhookUrl: `${this.baseWebhookUrl}/api/v1/webhooks/whatsapp/${config.tenantId}`,
      lastTestedAt: config.lastTestedAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      maskedCredentials,
    };
  }
}
