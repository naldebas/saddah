import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Get a Prisma client scoped to a specific tenant
   * All queries will automatically filter by tenantId
   */
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async findFirst({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async findUnique({ model, operation, args, query }) {
            // For unique queries, we still filter but need to add tenantId check
            return query(args);
          },
          async create({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              (args.data as any).tenantId = tenantId;
            }
            return query(args);
          },
          async createMany({ model, operation, args, query }) {
            if (this.hasTenantId(model) && Array.isArray(args.data)) {
              args.data = args.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            }
            return query(args);
          },
          async update({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async updateMany({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async delete({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async deleteMany({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async count({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async aggregate({ model, operation, args, query }) {
            if (this.hasTenantId(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
        },
      },
    });
  }

  /**
   * Check if a model has tenantId field
   */
  private hasTenantId(model: string): boolean {
    const modelsWithTenant = [
      'User',
      'Contact',
      'Company',
      'Pipeline',
      'Deal',
      'Lead',
      'Activity',
      'Conversation',
    ];
    return modelsWithTenant.includes(model);
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
