// src/modules/integrations/botpress/botpress-bot-api.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BotpressBotApiService {
  private readonly logger = new Logger(BotpressBotApiService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate that tenantId exists and has botpress enabled
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    return !!tenant;
  }

  /**
   * Get distinct property types from active projects
   * Returns Arabic-friendly type names
   */
  async getPropertyTypes(tenantId: string): Promise<string[]> {
    const types = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        status: 'available',
        project: {
          isActive: true,
          status: 'active',
        },
      },
      select: { type: true },
      distinct: ['type'],
    });

    return types.map((t) => t.type);
  }

  /**
   * Get districts that have active projects with available units,
   * optionally filtered by property type
   */
  async getDistricts(tenantId: string, type?: string): Promise<string[]> {
    const where: any = {
      tenantId,
      isActive: true,
      status: 'active',
      products: {
        some: {
          isActive: true,
          status: 'available',
          ...(type && { type }),
        },
      },
    };

    const projects = await this.prisma.project.findMany({
      where,
      select: { district: true },
      distinct: ['district'],
      orderBy: { district: 'asc' },
    });

    return projects
      .filter((p) => p.district)
      .map((p) => p.district as string);
  }

  /**
   * Get projects in a district with summary info
   */
  async getProjects(
    tenantId: string,
    district?: string,
    type?: string,
  ): Promise<any[]> {
    const where: any = {
      tenantId,
      isActive: true,
      status: 'active',
      ...(district && { district }),
      products: {
        some: {
          isActive: true,
          status: 'available',
          ...(type && { type }),
        },
      },
    };

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        products: {
          where: {
            isActive: true,
            status: 'available',
            ...(type && { type }),
          },
          select: {
            price: true,
            type: true,
            area: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return projects.map((project) => {
      const prices = project.products.map((p) => Number(p.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const availableCount = project.products.length;
      const unitTypes = [...new Set(project.products.map((p) => p.type))];

      return {
        id: project.id,
        name: project.name,
        city: project.city,
        district: project.district,
        summary: `${availableCount} وحدة متاحة - تبدأ من ${this.formatPrice(minPrice)}`,
        availableUnits: availableCount,
        startingPrice: minPrice,
        unitTypes,
      };
    });
  }

  /**
   * Get project details with available units summary
   */
  async getProjectDetails(tenantId: string, projectId: string): Promise<any> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
        isActive: true,
      },
      include: {
        products: {
          where: {
            isActive: true,
            status: 'available',
          },
          select: {
            type: true,
            area: true,
            bedrooms: true,
            price: true,
          },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    const prices = project.products.map((p) => Number(p.price));
    const areas = project.products.map((p) => Number(p.area));

    // Group by type + bedrooms
    const typeGroups: Record<string, number> = {};
    project.products.forEach((p) => {
      const key = p.bedrooms ? `${p.type} ${p.bedrooms} غرف` : p.type;
      typeGroups[key] = (typeGroups[key] || 0) + 1;
    });

    return {
      id: project.id,
      name: project.name,
      city: project.city,
      district: project.district,
      description: project.description,
      availableUnits: project.products.length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      areaRange: {
        min: areas.length > 0 ? Math.min(...areas) : 0,
        max: areas.length > 0 ? Math.max(...areas) : 0,
      },
      types: Object.entries(typeGroups).map(([type, count]) => `${type} (${count})`),
    };
  }

  private formatPrice(price: number): string {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M ريال`;
    }
    if (price >= 1000) {
      return `${Math.round(price / 1000)}K ريال`;
    }
    return `${price} ريال`;
  }
}
