// src/modules/companies/companies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        tenantId,
        name: dto.name,
        industry: dto.industry,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        country: dto.country || 'SA',
        size: dto.size,
        tags: dto.tags || [],
        customFields: dto.customFields || {},
      },
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, query: QueryCompaniesDto) {
    const {
      page = 1,
      limit = 20,
      search,
      industry,
      city,
      size,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {
      tenantId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(industry && { industry }),
      ...(city && { city }),
      ...(size && { size }),
    };

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              contacts: true,
              deals: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
          },
        },
        deals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            value: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('الشركة غير موجودة');
    }

    return company;
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto) {
    await this.findOne(tenantId, id);

    return this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.customFields && { customFields: dto.customFields }),
      },
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Soft delete
    await this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'تم حذف الشركة بنجاح' };
  }

  // Get distinct industries for filtering
  async getIndustries(tenantId: string) {
    const companies = await this.prisma.company.findMany({
      where: { tenantId, isActive: true },
      select: { industry: true },
      distinct: ['industry'],
    });

    return companies
      .map((c) => c.industry)
      .filter((industry): industry is string => industry !== null);
  }

  // Get distinct cities for filtering
  async getCities(tenantId: string) {
    const companies = await this.prisma.company.findMany({
      where: { tenantId, isActive: true },
      select: { city: true },
      distinct: ['city'],
    });

    return companies
      .map((c) => c.city)
      .filter((city): city is string => city !== null);
  }
}
