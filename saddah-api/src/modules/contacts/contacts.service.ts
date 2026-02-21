// src/modules/contacts/contacts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        tenantId,
        ownerId: dto.ownerId || userId,
        companyId: dto.companyId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        title: dto.title,
        source: dto.source || 'manual',
        tags: dto.tags || [],
        customFields: dto.customFields || {},
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, query: QueryContactsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      ownerId,
      companyId,
      source,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      tenantId,
      isActive: true,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(ownerId && { ownerId }),
      ...(companyId && { companyId }),
      ...(source && { source }),
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              deals: true,
              activities: true,
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: true,
        deals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('جهة الاتصال غير موجودة');
    }

    return contact;
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(tenantId, id);

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.ownerId && { ownerId: dto.ownerId }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.customFields && { customFields: dto.customFields }),
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Soft delete
    await this.prisma.contact.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'تم حذف جهة الاتصال بنجاح' };
  }

  // Bulk operations
  async bulkDelete(tenantId: string, ids: string[]) {
    const result = await this.prisma.contact.updateMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      data: { isActive: false },
    });

    return {
      success: result.count,
      failed: ids.length - result.count,
      message: `تم حذف ${result.count} جهة اتصال`,
    };
  }

  async bulkAssign(tenantId: string, ids: string[], ownerId: string) {
    // Verify owner exists and belongs to tenant
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, tenantId, isActive: true },
    });

    if (!owner) {
      throw new NotFoundException('المستخدم المسؤول غير موجود');
    }

    const result = await this.prisma.contact.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        isActive: true,
      },
      data: { ownerId },
    });

    return {
      success: result.count,
      failed: ids.length - result.count,
      message: `تم تعيين ${result.count} جهة اتصال إلى ${owner.firstName} ${owner.lastName}`,
    };
  }

  async bulkAddTags(tenantId: string, ids: string[], tags: string[], replace = false) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        id: { in: ids },
        tenantId,
        isActive: true,
      },
      select: { id: true, tags: true },
    });

    // Use transaction to batch all updates (fixes N+1 query issue)
    const updateOperations = contacts.map((contact) => {
      const newTags = replace ? tags : [...new Set([...contact.tags, ...tags])];
      return this.prisma.contact.update({
        where: { id: contact.id },
        data: { tags: newTags },
      });
    });

    await this.prisma.$transaction(updateOperations);
    const successCount = contacts.length;

    return {
      success: successCount,
      failed: ids.length - successCount,
      message: replace
        ? `تم استبدال الوسوم لـ ${successCount} جهة اتصال`
        : `تم إضافة الوسوم لـ ${successCount} جهة اتصال`,
    };
  }

  async bulkMoveToCompany(tenantId: string, ids: string[], companyId: string) {
    // Verify company exists and belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId, isActive: true },
    });

    if (!company) {
      throw new NotFoundException('الشركة غير موجودة');
    }

    const result = await this.prisma.contact.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        isActive: true,
      },
      data: { companyId },
    });

    return {
      success: result.count,
      failed: ids.length - result.count,
      message: `تم نقل ${result.count} جهة اتصال إلى ${company.name}`,
    };
  }
}
