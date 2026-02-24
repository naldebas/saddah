// src/modules/integrations/whatsapp/whatsapp-media.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WhatsAppMediaService, MEDIA_TYPES } from './whatsapp-media.service';

// Multer configuration for file uploads
const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Get all allowed mime types
    const allowedMimes = [
      ...MEDIA_TYPES.image.mimeTypes,
      ...MEDIA_TYPES.audio.mimeTypes,
      ...MEDIA_TYPES.video.mimeTypes,
      ...MEDIA_TYPES.document.mimeTypes,
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
};

@ApiTags('WhatsApp Media')
@Controller('media/whatsapp')
export class WhatsAppMediaController {
  constructor(private readonly mediaService: WhatsAppMediaService) {}

  /**
   * Serve media files (public endpoint for WhatsApp to fetch)
   */
  @Get(':type/:filename')
  @Public()
  @ApiOperation({ summary: 'Get media file' })
  @ApiParam({ name: 'type', description: 'Media type folder (images, audio, video, documents, thumbnails)' })
  @ApiParam({ name: 'filename', description: 'File name' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getMedia(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Validate type to prevent directory traversal
    const allowedTypes = ['images', 'audio', 'video', 'documents', 'thumbnails'];
    if (!allowedTypes.includes(type)) {
      throw new NotFoundException('Invalid media type');
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const relativePath = path.join(type, sanitizedFilename);

    const stream = this.mediaService.getFileStream(relativePath);

    if (!stream) {
      throw new NotFoundException('File not found');
    }

    // Get file info for content-type
    const uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp');
    const fullPath = path.join(uploadDir, relativePath);
    const fileInfo = this.mediaService.getFileInfo(fullPath);

    // Set content type
    res.set({
      'Content-Type': fileInfo.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    return new StreamableFile(stream);
  }

  /**
   * Upload media file for sending via WhatsApp
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media file for WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Media file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        mediaId: { type: 'string' },
        mediaUrl: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{
    success: boolean;
    mediaId?: string;
    mediaUrl?: string;
    mimeType: string;
    size: number;
    error?: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.mediaService.prepareMediaForSending(
      file.path,
      file.mimetype,
    );

    if (result.error) {
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      mediaId: result.mediaId,
      mediaUrl: result.mediaUrl,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Get supported media types and limits
   */
  @Get('types')
  @Public()
  @ApiOperation({ summary: 'Get supported media types and limits' })
  @ApiResponse({
    status: 200,
    description: 'Media type configuration',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          mimeTypes: { type: 'array', items: { type: 'string' } },
          maxSize: { type: 'number' },
          extensions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  })
  getMediaTypes(): typeof MEDIA_TYPES {
    return MEDIA_TYPES;
  }

  /**
   * Trigger cleanup of expired temp files
   */
  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up expired temporary files' })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed',
    schema: {
      type: 'object',
      properties: {
        cleaned: { type: 'number' },
      },
    },
  })
  async cleanup(): Promise<{ cleaned: number }> {
    const cleaned = await this.mediaService.cleanupTempFiles();
    return { cleaned };
  }
}
