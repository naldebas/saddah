// src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto, ChangePasswordDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        language: true,
        managerId: true,
        createdAt: true,
        lastLoginAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            ownedDeals: true,
            activities: true,
            teamMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        language: true,
        managerId: true,
        createdAt: true,
        lastLoginAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        teamMembers: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: {
            ownedDeals: true,
            activities: true,
            ownedContacts: true,
            teamMembers: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    // Check if email already exists for this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        passwordHash: hashedPassword,
        tenantId,
        language: dto.language || 'ar',
        managerId: dto.managerId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        language: true,
        managerId: true,
        createdAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        language: true,
        isActive: true,
        managerId: true,
        updatedAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'تم حذف المستخدم بنجاح' };
  }

  // Profile management
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        language: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        language: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('كلمة المرور الجديدة غير متطابقة');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        avatar: true,
      },
    });
  }

  /**
   * Get team dashboard for a sales manager
   * Shows team members with their statistics
   */
  async getTeamDashboard(tenantId: string, managerId: string) {
    // Get team members
    const teamMembers = await this.prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Get statistics for each team member
    const teamStats = await Promise.all(
      teamMembers.map(async (member) => {
        const [dealsStats, leadsStats, activitiesStats, contactsStats] = await Promise.all([
          // Deals statistics
          this.prisma.deal.groupBy({
            by: ['status'],
            where: { ownerId: member.id, tenantId },
            _count: { id: true },
            _sum: { value: true },
          }),
          // Leads statistics
          this.prisma.lead.groupBy({
            by: ['status'],
            where: { ownerId: member.id, tenantId },
            _count: { id: true },
          }),
          // Activities statistics (this month)
          this.prisma.activity.aggregate({
            where: {
              createdById: member.id,
              tenantId,
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            _count: { id: true },
          }),
          // Contacts count
          this.prisma.contact.count({
            where: { ownerId: member.id, tenantId },
          }),
        ]);

        // Process deals stats
        const totalDeals = dealsStats.reduce((sum, d) => sum + d._count.id, 0);
        const wonDeals = dealsStats.find((d) => d.status === 'won');
        const openDeals = dealsStats.find((d) => d.status === 'open');

        // Process leads stats
        const totalLeads = leadsStats.reduce((sum, l) => sum + l._count.id, 0);
        const convertedLeads = leadsStats.find((l) => l.status === 'converted');

        return {
          ...member,
          stats: {
            deals: {
              total: totalDeals,
              won: wonDeals?._count.id || 0,
              wonValue: Number(wonDeals?._sum.value || 0),
              open: openDeals?._count.id || 0,
              openValue: Number(openDeals?._sum.value || 0),
            },
            leads: {
              total: totalLeads,
              converted: convertedLeads?._count.id || 0,
              conversionRate: totalLeads > 0
                ? Math.round(((convertedLeads?._count.id || 0) / totalLeads) * 100)
                : 0,
            },
            activities: {
              thisMonth: activitiesStats._count.id || 0,
            },
            contacts: {
              total: contactsStats,
            },
          },
        };
      }),
    );

    // Calculate team totals
    const totalLeadsCount = teamStats.reduce((sum, m) => sum + m.stats.leads.total, 0);
    const convertedLeadsCount = teamStats.reduce((sum, m) => sum + m.stats.leads.converted, 0);

    const teamTotals = {
      members: teamMembers.length,
      deals: {
        total: teamStats.reduce((sum, m) => sum + m.stats.deals.total, 0),
        won: teamStats.reduce((sum, m) => sum + m.stats.deals.won, 0),
        wonValue: teamStats.reduce((sum, m) => sum + m.stats.deals.wonValue, 0),
        open: teamStats.reduce((sum, m) => sum + m.stats.deals.open, 0),
        openValue: teamStats.reduce((sum, m) => sum + m.stats.deals.openValue, 0),
      },
      leads: {
        total: totalLeadsCount,
        converted: convertedLeadsCount,
        conversionRate: totalLeadsCount > 0
          ? Math.round((convertedLeadsCount / totalLeadsCount) * 100)
          : 0,
      },
      activities: {
        thisMonth: teamStats.reduce((sum, m) => sum + m.stats.activities.thisMonth, 0),
      },
      contacts: {
        total: teamStats.reduce((sum, m) => sum + m.stats.contacts.total, 0),
      },
    };

    return {
      teamMembers: teamStats,
      totals: teamTotals,
    };
  }

  /**
   * Get list of managers for team assignment dropdown
   */
  async getManagers(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['admin', 'manager', 'sales_manager'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        _count: {
          select: {
            teamMembers: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
