// src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for required roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check for required permission
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions specified, allow access
    if (!requiredRoles && !requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        return false;
      }
    }

    // Check permission
    if (requiredPermission) {
      return this.hasPermission(user.permissions, requiredPermission);
    }

    return true;
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check for exact permission
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard (e.g., 'contacts.*' matches 'contacts.view')
    const [resource] = requiredPermission.split('.');
    if (userPermissions.includes(`${resource}.*`)) {
      return true;
    }

    return false;
  }
}
