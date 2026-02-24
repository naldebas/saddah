// src/modules/settings/utils/encryption.util.ts
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Utility class for encrypting and decrypting sensitive data
 */
export class EncryptionUtil {
  private readonly encryptionKey: Buffer;

  constructor(secret: string) {
    // Derive a consistent key from the secret
    this.encryptionKey = crypto.scryptSync(secret, 'saddah-salt', KEY_LENGTH);
  }

  /**
   * Encrypt a string value
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + EncryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt an object (serializes to JSON first)
   */
  encryptObject<T>(obj: T): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt to an object
   */
  decryptObject<T>(encryptedText: string): T {
    const json = this.decrypt(encryptedText);
    return JSON.parse(json) as T;
  }

  /**
   * Generate a random webhook secret
   */
  static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask a string for display (show first 4 and last 4 chars)
   */
  static maskString(value: string, showChars = 4): string {
    if (!value || value.length <= showChars * 2) {
      return '***';
    }
    const start = value.substring(0, showChars);
    const end = value.substring(value.length - showChars);
    return `${start}***${end}`;
  }

  /**
   * Mask credentials object for safe display
   */
  static maskCredentials(credentials: Record<string, any>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string') {
        masked[key] = EncryptionUtil.maskString(value);
      } else {
        masked[key] = '***';
      }
    }
    return masked;
  }
}
