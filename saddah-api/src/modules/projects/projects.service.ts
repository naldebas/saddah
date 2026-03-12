import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        city: dto.city,
        district: dto.district,
        type: dto.type,
        description: dto.description,
        totalUnits: dto.totalUnits || 0,
        status: dto.status || 'active',
        images: dto.images || [],
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findAll(tenantId: string, query: QueryProjectsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      city,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      isActive: true,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
      ...(city && { city }),
      ...(type && { type }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
          products: {
            where: { isActive: true },
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    // Calculate product statistics for each project
    const projectsWithStats = data.map((project) => {
      const available = project.products.filter((p) => p.status === 'available').length;
      const reserved = project.products.filter((p) => p.status === 'reserved').length;
      const sold = project.products.filter((p) => p.status === 'sold').length;

      return {
        ...project,
        products: undefined, // Remove raw products from response
        productStats: {
          total: project._count.products,
          available,
          reserved,
          sold,
        },
      };
    });

    return {
      data: projectsWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { unitNumber: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    // Calculate statistics
    const available = project.products.filter((p) => p.status === 'available').length;
    const reserved = project.products.filter((p) => p.status === 'reserved').length;
    const sold = project.products.filter((p) => p.status === 'sold').length;

    return {
      ...project,
      productStats: {
        total: project._count.products,
        available,
        reserved,
        sold,
      },
    };
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(tenantId, id);

    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Soft delete - just mark as inactive
    await this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'تم حذف المشروع بنجاح' };
  }

  async getStatistics(tenantId: string) {
    const [
      totalProjects,
      activeProjects,
      comingSoonProjects,
      soldOutProjects,
      projectsByCity,
      projectsByType,
    ] = await Promise.all([
      this.prisma.project.count({ where: { tenantId, isActive: true } }),
      this.prisma.project.count({ where: { tenantId, isActive: true, status: 'active' } }),
      this.prisma.project.count({ where: { tenantId, isActive: true, status: 'coming_soon' } }),
      this.prisma.project.count({ where: { tenantId, isActive: true, status: 'sold_out' } }),
      this.prisma.project.groupBy({
        by: ['city'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
      this.prisma.project.groupBy({
        by: ['type'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
    ]);

    return {
      total: totalProjects,
      byStatus: {
        active: activeProjects,
        comingSoon: comingSoonProjects,
        soldOut: soldOutProjects,
      },
      byCity: projectsByCity.map((item) => ({
        city: item.city,
        count: item._count.id,
      })),
      byType: projectsByType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
    };
  }

  async getCities(tenantId: string) {
    const cities = await this.prisma.project.findMany({
      where: { tenantId, isActive: true },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });

    return cities.map((c) => c.city);
  }
}
