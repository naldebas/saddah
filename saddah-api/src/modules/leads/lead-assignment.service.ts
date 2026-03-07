// src/modules/leads/lead-assignment.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

// Roles that can reassign leads
const REASSIGN_ROLES = ['admin', 'manager', 'sales_manager'];

// Roles eligible to receive lead assignments
const ASSIGNABLE_ROLES = ['sales_rep', 'sales', 'sales_manager', 'manager'];

@Injectable()
export class LeadAssignmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the next sales rep using round-robin assignment
   * Rotates through all active sales reps in the tenant
   */
  async getNextAssignee(tenantId: string): Promise<string | null> {
    // Get all active sales reps in the tenant
    const salesReps = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ASSIGNABLE_ROLES },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' }, // Consistent ordering
    });

    if (salesReps.length === 0) {
      return null; // No sales reps available
    }

    // Get tenant settings to find last assigned user
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, any>) || {};
    const lastAssignedUserId = settings.lastAssignedLeadUserId as string | undefined;

    // Find the index of the last assigned user
    let nextIndex = 0;
    if (lastAssignedUserId) {
      const lastIndex = salesReps.findIndex((rep) => rep.id === lastAssignedUserId);
      if (lastIndex !== -1) {
        // Move to next rep in rotation
        nextIndex = (lastIndex + 1) % salesReps.length;
      }
    }

    const nextAssignee = salesReps[nextIndex];

    // Update tenant settings with the new last assigned user
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...settings,
          lastAssignedLeadUserId: nextAssignee.id,
        },
      },
    });

    return nextAssignee.id;
  }

  /**
   * Get list of available sales reps for manual assignment
   */
  async getAvailableAssignees(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ASSIGNABLE_ROLES },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        _count: {
          select: {
            ownedLeads: {
              where: {
                status: { notIn: ['converted', 'lost'] },
              },
            },
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Reassign a lead to a different sales rep
   * Only admin and sales managers can reassign
   */
  async reassignLead(
    tenantId: string,
    leadId: string,
    newOwnerId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Check if current user can reassign
    if (!REASSIGN_ROLES.includes(currentUserRole)) {
      throw new ForbiddenException('لا يمكنك إعادة تعيين العملاء المحتملين');
    }

    // Verify lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      throw new NotFoundException('العميل المحتمل غير موجود');
    }

    // Verify new owner exists and is in same tenant
    const newOwner = await this.prisma.user.findFirst({
      where: {
        id: newOwnerId,
        tenantId,
        isActive: true,
      },
    });

    if (!newOwner) {
      throw new NotFoundException('المستخدم الجديد غير موجود');
    }

    // Update lead owner
    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { ownerId: newOwnerId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updatedLead;
  }

  /**
   * Bulk reassign multiple leads to a sales rep
   */
  async bulkReassign(
    tenantId: string,
    leadIds: string[],
    newOwnerId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Check if current user can reassign
    if (!REASSIGN_ROLES.includes(currentUserRole)) {
      throw new ForbiddenException('لا يمكنك إعادة تعيين العملاء المحتملين');
    }

    // Verify new owner exists
    const newOwner = await this.prisma.user.findFirst({
      where: {
        id: newOwnerId,
        tenantId,
        isActive: true,
      },
    });

    if (!newOwner) {
      throw new NotFoundException('المستخدم الجديد غير موجود');
    }

    // Update all leads
    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        tenantId,
      },
      data: { ownerId: newOwnerId },
    });

    return {
      message: `تم إعادة تعيين ${result.count} عميل محتمل`,
      count: result.count,
    };
  }

  /**
   * Get unassigned leads (leads without owner)
   */
  async getUnassignedLeads(tenantId: string) {
    return this.prisma.lead.findMany({
      where: {
        tenantId,
        ownerId: null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(tenantId: string) {
    const [totalLeads, unassignedLeads, leadsByOwner] = await Promise.all([
      this.prisma.lead.count({
        where: { tenantId, status: { notIn: ['converted', 'lost'] } },
      }),
      this.prisma.lead.count({
        where: { tenantId, ownerId: null },
      }),
      this.prisma.lead.groupBy({
        by: ['ownerId'],
        where: {
          tenantId,
          ownerId: { not: null },
          status: { notIn: ['converted', 'lost'] },
        },
        _count: { id: true },
      }),
    ]);

    // Get owner details
    const ownerIds = leadsByOwner
      .map((item) => item.ownerId)
      .filter((id): id is string => id !== null);

    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    return {
      totalActiveLeads: totalLeads,
      unassignedLeads,
      byOwner: leadsByOwner.map((item) => ({
        owner: ownerMap.get(item.ownerId!),
        count: item._count.id,
      })),
    };
  }
}
