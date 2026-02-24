// src/modules/integrations/whatsapp/guards/webhook-signature.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppAdapterFactory } from '../whatsapp.factory';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(
    private readonly adapterFactory: WhatsAppAdapterFactory,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provider = this.configService.get<string>('whatsapp.provider', 'twilio');

    // GET requests are for webhook verification - no signature needed
    if (request.method === 'GET') {
      return true;
    }

    // For POST requests, verify the signature
    const adapter = this.adapterFactory.getAdapter();

    // Get the signature header based on provider
    let signature: string | undefined;

    if (provider === 'meta') {
      signature = request.headers['x-hub-signature-256'];
    } else if (provider === 'twilio') {
      signature = request.headers['x-twilio-signature'];
    }

    // If no signature provided, check if we should skip verification (dev mode)
    if (!signature) {
      const skipVerification = this.configService.get<boolean>(
        'WHATSAPP_SKIP_SIGNATURE_VERIFICATION',
        false,
      );

      if (skipVerification) {
        this.logger.warn('Skipping webhook signature verification (dev mode)');
        return true;
      }

      this.logger.warn('Webhook request missing signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Get the raw body for signature verification
    const rawBody = request.rawBody || JSON.stringify(request.body);

    const isValid = adapter.verifyWebhookSignature(signature, rawBody);

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
