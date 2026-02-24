// src/modules/integrations/whatsapp/whatsapp-media.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppAdapter, WHATSAPP_ADAPTER } from './interfaces/whatsapp-adapter.interface';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Supported media types with their constraints
 */
export const MEDIA_TYPES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 16 * 1024 * 1024, // 16 MB
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  audio: {
    mimeTypes: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    maxSize: 16 * 1024 * 1024, // 16 MB
    extensions: ['.aac', '.mp4', '.mp3', '.amr', '.ogg'],
  },
  video: {
    mimeTypes: ['video/mp4', 'video/3gpp'],
    maxSize: 16 * 1024 * 1024, // 16 MB
    extensions: ['.mp4', '.3gp'],
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    maxSize: 100 * 1024 * 1024, // 100 MB for documents
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
  },
  sticker: {
    mimeTypes: ['image/webp'],
    maxSize: 500 * 1024, // 500 KB for stickers
    extensions: ['.webp'],
  },
};

/**
 * Media file metadata
 */
export interface MediaMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: keyof typeof MEDIA_TYPES;
  storagePath: string;
  publicUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  mediaId?: string;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Download result
 */
export interface DownloadResult {
  success: boolean;
  localPath?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

@Injectable()
export class WhatsAppMediaService {
  private readonly logger = new Logger(WhatsAppMediaService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly tempDir: string;

  constructor(
    @Inject(WHATSAPP_ADAPTER)
    private readonly adapter: WhatsAppAdapter,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure storage directories
    this.uploadDir = this.configService.get<string>(
      'UPLOAD_DIR',
      path.join(process.cwd(), 'uploads', 'whatsapp'),
    );
    this.tempDir = this.configService.get<string>(
      'TEMP_DIR',
      path.join(process.cwd(), 'temp'),
    );
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.uploadDir,
      this.tempDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'audio'),
      path.join(this.uploadDir, 'video'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'thumbnails'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    }
  }

  // ============================================
  // INBOUND MEDIA (Download from WhatsApp)
  // ============================================

  /**
   * Download and store media from WhatsApp
   * WhatsApp media URLs are temporary, so we need to download and store permanently
   */
  async downloadAndStoreMedia(
    mediaIdOrUrl: string,
    messageId: string,
    mimeType?: string,
  ): Promise<UploadResult> {
    this.logger.debug(`Downloading media: ${mediaIdOrUrl}`);

    try {
      // Get the actual download URL from the adapter
      const mediaInfo = await this.adapter.downloadMedia(mediaIdOrUrl);

      if (!mediaInfo) {
        return { success: false, error: 'Could not retrieve media URL' };
      }

      // Download the file
      const downloadResult = await this.downloadFile(
        mediaInfo.url,
        mimeType || mediaInfo.mimeType,
      );

      if (!downloadResult.success || !downloadResult.localPath) {
        return { success: false, error: downloadResult.error || 'Download failed' };
      }

      // Determine media type from mime type
      const mediaType = this.getMediaTypeFromMimeType(
        mimeType || mediaInfo.mimeType,
      );

      // Generate permanent storage path
      const fileExt = this.getExtensionFromMimeType(mimeType || mediaInfo.mimeType);
      const fileName = `${messageId}-${Date.now()}${fileExt}`;
      const storagePath = path.join(this.uploadDir, mediaType + 's', fileName);

      // Move from temp to permanent storage
      fs.renameSync(downloadResult.localPath, storagePath);

      // Generate public URL
      const publicUrl = `${this.baseUrl}/api/v1/media/whatsapp/${mediaType}s/${fileName}`;

      // Generate thumbnail for images/videos
      let thumbnailUrl: string | undefined;
      if (mediaType === 'image') {
        thumbnailUrl = await this.generateThumbnail(storagePath, fileName);
      }

      this.logger.log(`Media stored: ${storagePath}`);

      return {
        success: true,
        mediaId: fileName,
        url: publicUrl,
        thumbnailUrl,
      };
    } catch (error: any) {
      this.logger.error(`Failed to download media: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download a file from URL to temp directory
   */
  private async downloadFile(url: string, mimeType?: string): Promise<DownloadResult> {
    try {
      const response = await fetch(url, {
        headers: {
          // Add auth header for Twilio URLs
          ...(url.includes('twilio.com') ? {
            Authorization: `Basic ${Buffer.from(
              `${this.configService.get('whatsapp.twilio.accountSid')}:${this.configService.get('whatsapp.twilio.authToken')}`,
            ).toString('base64')}`,
          } : {}),
          // Add bearer token for Meta URLs
          ...(url.includes('graph.facebook.com') ? {
            Authorization: `Bearer ${this.configService.get('whatsapp.meta.token')}`,
          } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || mimeType || 'application/octet-stream';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      // Validate file size
      const mediaType = this.getMediaTypeFromMimeType(contentType);
      const maxSize = MEDIA_TYPES[mediaType]?.maxSize || 16 * 1024 * 1024;

      if (contentLength > maxSize) {
        throw new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`);
      }

      // Download to temp file
      const tempFileName = `${crypto.randomUUID()}${this.getExtensionFromMimeType(contentType)}`;
      const tempPath = path.join(this.tempDir, tempFileName);

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));

      return {
        success: true,
        localPath: tempPath,
        mimeType: contentType,
        size: buffer.byteLength,
      };
    } catch (error: any) {
      this.logger.error(`Download failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // OUTBOUND MEDIA (Upload to WhatsApp)
  // ============================================

  /**
   * Prepare media for sending via WhatsApp
   * For Meta API, we need to upload media first to get a media ID
   * For Twilio, we just need a publicly accessible URL
   */
  async prepareMediaForSending(
    localPath: string,
    mimeType: string,
  ): Promise<{ mediaId?: string; mediaUrl?: string; error?: string }> {
    // Validate file exists
    if (!fs.existsSync(localPath)) {
      return { error: 'File not found' };
    }

    const stats = fs.statSync(localPath);
    const mediaType = this.getMediaTypeFromMimeType(mimeType);

    // Validate file size
    const maxSize = MEDIA_TYPES[mediaType]?.maxSize || 16 * 1024 * 1024;
    if (stats.size > maxSize) {
      return { error: `File too large: ${stats.size} bytes (max: ${maxSize})` };
    }

    // Validate mime type
    if (!this.isValidMimeType(mimeType, mediaType)) {
      return { error: `Invalid mime type: ${mimeType} for ${mediaType}` };
    }

    const provider = this.adapter.getProviderName();

    if (provider === 'meta') {
      // Meta requires uploading media first
      return this.uploadToMeta(localPath, mimeType);
    } else {
      // Twilio accepts URLs directly - make the file accessible
      const fileName = path.basename(localPath);
      const publicUrl = `${this.baseUrl}/api/v1/media/whatsapp/${mediaType}s/${fileName}`;
      return { mediaUrl: publicUrl };
    }
  }

  /**
   * Upload media to Meta WhatsApp Business API
   */
  private async uploadToMeta(
    filePath: string,
    mimeType: string,
  ): Promise<{ mediaId?: string; error?: string }> {
    try {
      const accessToken = this.configService.get<string>('whatsapp.meta.token');
      const phoneNumberId = this.configService.get<string>('whatsapp.meta.phoneNumberId');

      if (!accessToken || !phoneNumberId) {
        return { error: 'Meta credentials not configured' };
      }

      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: mimeType });

      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', blob, path.basename(filePath));

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return { mediaId: data.id };
    } catch (error: any) {
      this.logger.error(`Meta upload failed: ${error.message}`);
      return { error: error.message };
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get media type from MIME type
   */
  private getMediaTypeFromMimeType(mimeType: string): keyof typeof MEDIA_TYPES {
    const mime = mimeType.toLowerCase();

    if (mime.startsWith('image/')) {
      return mime === 'image/webp' ? 'sticker' : 'image';
    }
    if (mime.startsWith('audio/')) {
      return 'audio';
    }
    if (mime.startsWith('video/')) {
      return 'video';
    }
    return 'document';
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/aac': '.aac',
      'audio/ogg': '.ogg',
      'audio/amr': '.amr',
      'video/mp4': '.mp4',
      'video/3gpp': '.3gp',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
    };

    return mimeToExt[mimeType.toLowerCase()] || '.bin';
  }

  /**
   * Validate MIME type for media type
   */
  private isValidMimeType(mimeType: string, mediaType: keyof typeof MEDIA_TYPES): boolean {
    const config = MEDIA_TYPES[mediaType];
    if (!config) {
      return false;
    }
    return config.mimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Generate thumbnail for image (simplified - just returns the same URL for now)
   * In production, use sharp or similar library
   */
  private async generateThumbnail(
    sourcePath: string,
    fileName: string,
  ): Promise<string | undefined> {
    try {
      // For now, just return a thumbnail URL path
      // In production, use sharp to generate actual thumbnails
      const thumbPath = path.join(this.uploadDir, 'thumbnails', `thumb-${fileName}`);

      // Copy as placeholder (in production, resize to thumbnail)
      fs.copyFileSync(sourcePath, thumbPath);

      return `${this.baseUrl}/api/v1/media/whatsapp/thumbnails/thumb-${fileName}`;
    } catch (error) {
      this.logger.warn(`Failed to generate thumbnail: ${error}`);
      return undefined;
    }
  }

  /**
   * Update message with permanent media URL
   */
  async updateMessageMediaUrl(
    messageId: string,
    permanentUrl: string,
    thumbnailUrl?: string,
  ): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        mediaUrl: permanentUrl,
        // Store thumbnail in metadata if needed
      },
    });
  }

  /**
   * Clean up expired temporary files
   */
  async cleanupTempFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    try {
      const files = fs.readdirSync(this.tempDir);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} temporary files`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup temp files', error);
    }

    return cleaned;
  }

  /**
   * Get file info
   */
  getFileInfo(filePath: string): { exists: boolean; size?: number; mimeType?: string } {
    if (!fs.existsSync(filePath)) {
      return { exists: false };
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Reverse lookup mime type from extension
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
    };

    return {
      exists: true,
      size: stats.size,
      mimeType: extToMime[ext] || 'application/octet-stream',
    };
  }

  /**
   * Get file stream for serving
   */
  getFileStream(relativePath: string): fs.ReadStream | null {
    const fullPath = path.join(this.uploadDir, relativePath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fs.createReadStream(fullPath);
  }
}
