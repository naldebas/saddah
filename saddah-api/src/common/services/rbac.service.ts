import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Role-Based Access Control Service
 *
 * Implements the following access hierarchy:
 * - admin: Full access to all resources
 * - sales_manager/manager: Access to own resources + team members' resources
 * - sales_rep/sales/support: Access only to own resources
 */

// Roles with full access to all resources
export const ADMIN_ROLES = ['admin'];

// Roles that can see their team's resources
export const TEAM_LEADER_ROLES = ['sales_manager', 'manager'];

// All roles with elevated access (admin + team leaders)
export const FULL_ACCESS_ROLES = [...ADMIN_ROLES, ...TEAM_LEADER_ROLES];

export interface RbacContext {
  userId: string;
  userRole: string;
  tenantId: string;
}

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has admin role
   */
  isAdmin(userRole: string): boolean {
    return ADMIN_ROLES.includes(userRole);
  }

  /**
   * Check if user is a team leader (sales_manager or manager)
   */
  isTeamLeader(userRole: string): boolean {
    return TEAM_LEADER_ROLES.includes(userRole);
  }

  /**
   * Check if user has full access (admin or team leader)
   */
  hasFullAccess(userRole: string): boolean {
    return FULL_ACCESS_ROLES.includes(userRole);
  }

  /**
   * Get IDs of all team members for a manager
   * Returns array including the manager's own ID
   */
  async getTeamMemberIds(managerId: string, tenantId: string): Promise<string[]> {
    const teamMembers = await this.prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
      },
      select: { id: true },
    });

    // Include manager's own ID + all team member IDs
    return [managerId, ...teamMembers.map((m) => m.id)];
  }

  /**
   * Get ownership filter for queries based on user role
   *
   * - Admin: No filter (sees all)
   * - Sales Manager: Filter by team member IDs
   * - Sales Rep: Filter by own ID only
   */
  async getOwnershipFilter(
    context: RbacContext,
  ): Promise<{ ownerId?: string | { in: string[] } }> {
    const { userId, userRole, tenantId } = context;

    // Admin sees everything
    if (this.isAdmin(userRole)) {
      return {};
    }

    // Team leader sees their team's resources
    if (this.isTeamLeader(userRole)) {
      const teamMemberIds = await this.getTeamMemberIds(userId, tenantId);
      return { ownerId: { in: teamMemberIds } };
    }

    // Regular user sees only their own resources
    return { ownerId: userId };
  }

  /**
   * Get createdBy filter for queries (used for activities)
   */
  async getCreatedByFilter(
    context: RbacContext,
  ): Promise<{ createdById?: string | { in: string[] } }> {
    const { userId, userRole, tenantId } = context;

    // Admin sees everything
    if (this.isAdmin(userRole)) {
      return {};
    }

    // Team leader sees their team's resources
    if (this.isTeamLeader(userRole)) {
      const teamMemberIds = await this.getTeamMemberIds(userId, tenantId);
      return { createdById: { in: teamMemberIds } };
    }

    // Regular user sees only their own resources
    return { createdById: userId };
  }

  /**
   * Check if user can access a specific resource
   */
  async canAccessResource(
    resource: { ownerId?: string | null; createdById?: string | null },
    context: RbacContext,
  ): Promise<boolean> {
    const { userId, userRole, tenantId } = context;
    const resourceOwnerId = resource.ownerId || resource.createdById;

    // Admin can access everything
    if (this.isAdmin(userRole)) {
      return true;
    }

    // If no owner, allow access (unassigned resources)
    if (!resourceOwnerId) {
      return true;
    }

    // Check if owned by user
    if (resourceOwnerId === userId) {
      return true;
    }

    // Team leader can access team members' resources
    if (this.isTeamLeader(userRole)) {
      const teamMemberIds = await this.getTeamMemberIds(userId, tenantId);
      return teamMemberIds.includes(resourceOwnerId);
    }

    return false;
  }

  /**
   * Get user IDs filter for reports
   * Returns array of user IDs that should be included in reports
   */
  async getReportUserIds(context: RbacContext): Promise<string[] | null> {
    const { userId, userRole, tenantId } = context;

    // Admin sees all - return null to indicate no filter
    if (this.isAdmin(userRole)) {
      return null;
    }

    // Team leader sees their team
    if (this.isTeamLeader(userRole)) {
      return this.getTeamMemberIds(userId, tenantId);
    }

    // Regular user sees only their own data
    return [userId];
  }

  /**
   * Check if user can edit a specific resource
   * - Admin: can edit all
   * - Sales Manager: can edit own and team's resources
   * - Sales Rep: can only edit their own resources
   */
  async canEditResource(
    resource: { ownerId?: string | null; createdById?: string | null },
    context: RbacContext,
  ): Promise<boolean> {
    const { userId, userRole, tenantId } = context;
    const resourceOwnerId = resource.ownerId || resource.createdById;

    // Admin can edit everything
    if (this.isAdmin(userRole)) {
      return true;
    }

    // If no owner, allow edit (unassigned resources)
    if (!resourceOwnerId) {
      return this.isTeamLeader(userRole); // Only managers can edit unassigned
    }

    // Team leader can edit team members' resources
    if (this.isTeamLeader(userRole)) {
      const teamMemberIds = await this.getTeamMemberIds(userId, tenantId);
      return teamMemberIds.includes(resourceOwnerId);
    }

    // Sales rep can only edit their own resources
    return resourceOwnerId === userId;
  }

  /**
   * Check if user can delete a specific resource
   * - Admin: can delete all
   * - Sales Manager: can delete own and team's resources
   * - Sales Rep: CANNOT delete any resources
   */
  async canDeleteResource(
    resource: { ownerId?: string | null; createdById?: string | null },
    context: RbacContext,
  ): Promise<boolean> {
    const { userId, userRole, tenantId } = context;
    const resourceOwnerId = resource.ownerId || resource.createdById;

    // Admin can delete everything
    if (this.isAdmin(userRole)) {
      return true;
    }

    // Team leader can delete team members' resources
    if (this.isTeamLeader(userRole)) {
      if (!resourceOwnerId) {
        return true; // Managers can delete unassigned resources
      }
      const teamMemberIds = await this.getTeamMemberIds(userId, tenantId);
      return teamMemberIds.includes(resourceOwnerId);
    }

    // Sales rep CANNOT delete any resources
    return false;
  }
}
