import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto, ProductStatus } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto) {
    // Verify project exists and belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId, isActive: true },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    // Check for duplicate unit number in the same project
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        projectId_unitNumber: {
          projectId: dto.projectId,
          unitNumber: dto.unitNumber,
        },
      },
    });

    if (existingProduct) {
      throw new BadRequestException('رقم الوحدة موجود مسبقاً في هذا المشروع');
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        unitNumber: dto.unitNumber,
        type: dto.type,
        area: dto.area,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        floor: dto.floor,
        price: dto.price,
        currency: dto.currency || 'SAR',
        status: dto.status || ProductStatus.AVAILABLE,
        features: dto.features || [],
        images: dto.images || [],
        isActive: dto.isActive ?? true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            type: true,
          },
        },
      },
    });

    // Update project total units count
    await this.updateProjectUnitCount(dto.projectId);

    return product;
  }

  async findAll(tenantId: string, query: QueryProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      projectId,
      type,
      status,
      minPrice,
      maxPrice,
      minBedrooms,
      minArea,
      maxArea,
      city,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const priceFilter: Prisma.DecimalFilter | undefined =
      minPrice !== undefined || maxPrice !== undefined
        ? {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          }
        : undefined;

    const areaFilter: Prisma.DecimalFilter | undefined =
      minArea !== undefined || maxArea !== undefined
        ? {
            ...(minArea !== undefined && { gte: minArea }),
            ...(maxArea !== undefined && { lte: maxArea }),
          }
        : undefined;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      ...(projectId && { projectId }),
      ...(search && {
        unitNumber: { contains: search, mode: 'insensitive' as const },
      }),
      ...(type && { type }),
      ...(status && { status }),
      ...(priceFilter && { price: priceFilter }),
      ...(areaFilter && { area: areaFilter }),
      ...(minBedrooms !== undefined && { bedrooms: { gte: minBedrooms } }),
      ...(city && {
        project: {
          city: { equals: city, mode: 'insensitive' as const },
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
              type: true,
            },
          },
        },
        orderBy: sortBy === 'price' || sortBy === 'area'
          ? { [sortBy]: sortOrder }
          : { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            type: true,
            description: true,
          },
        },
        deals: {
          select: {
            id: true,
            title: true,
            value: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('الوحدة غير موجودة');
    }

    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existingProduct = await this.findOne(tenantId, id);

    // If unitNumber is being changed, check for duplicates
    if (dto.unitNumber && dto.unitNumber !== existingProduct.unitNumber) {
      const duplicate = await this.prisma.product.findUnique({
        where: {
          projectId_unitNumber: {
            projectId: existingProduct.projectId,
            unitNumber: dto.unitNumber,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException('رقم الوحدة موجود مسبقاً في هذا المشروع');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            type: true,
          },
        },
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: ProductStatus) {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: { status },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            type: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id);

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Update project unit count
    await this.updateProjectUnitCount(product.projectId);

    return { message: 'تم حذف الوحدة بنجاح' };
  }

  async getStatistics(tenantId: string) {
    const [
      totalProducts,
      availableProducts,
      reservedProducts,
      soldProducts,
      productsByType,
      avgPrice,
    ] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true, status: 'available' } }),
      this.prisma.product.count({ where: { tenantId, isActive: true, status: 'reserved' } }),
      this.prisma.product.count({ where: { tenantId, isActive: true, status: 'sold' } }),
      this.prisma.product.groupBy({
        by: ['type'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
      this.prisma.product.aggregate({
        where: { tenantId, isActive: true },
        _avg: { price: true },
      }),
    ]);

    return {
      total: totalProducts,
      byStatus: {
        available: availableProducts,
        reserved: reservedProducts,
        sold: soldProducts,
      },
      byType: productsByType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
      averagePrice: avgPrice._avg.price ? Number(avgPrice._avg.price) : 0,
    };
  }

  private async updateProjectUnitCount(projectId: string) {
    const count = await this.prisma.product.count({
      where: { projectId, isActive: true },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { totalUnits: count },
    });
  }
}
