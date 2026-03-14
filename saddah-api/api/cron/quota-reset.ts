/**
 * Vercel Cron: Daily WhatsApp Quota Reset
 * Runs at midnight UTC daily
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset daily WhatsApp quota counters
    const result = await prisma.whatsAppQuotaUsage.updateMany({
      where: {
        dailyDate: {
          lt: today,
        },
      },
      data: {
        dailyCount: 0,
        warning80Sent: false,
        warning90Sent: false,
        warning100Sent: false,
      },
    });

    console.log(`[Cron] Reset ${result.count} quota records`);

    // Clean up expired refresh tokens
    const tokenCleanup = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[Cron] Cleaned up ${tokenCleanup.count} expired tokens`);

    return res.status(200).json({
      success: true,
      quotaResets: result.count,
      tokensCleanedUp: tokenCleanup.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Quota reset failed:', error);
    return res.status(500).json({ error: 'Quota reset failed' });
  } finally {
    await prisma.$disconnect();
  }
}
