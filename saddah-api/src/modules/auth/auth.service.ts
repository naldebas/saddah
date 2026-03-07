import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, Tenant } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';

type UserWithTenant = User & { tenant: Tenant };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      );
    }

    // Check tenant is active
    if (!user.tenant.isActive) {
      throw new UnauthorizedException('الحساب غير مفعل');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        language: user.language,
        tenantId: user.tenantId,
        avatar: user.avatar,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired or invalid');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user || !user.isActive || !user.tenant.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Delete old refresh token (rotation)
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          language: user.language,
          tenantId: user.tenantId,
          avatar: user.avatar,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
        tenant: {
          select: { isActive: true },
        },
      },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      return null;
    }

    return user;
  }

  private async generateTokens(user: UserWithTenant) {
    const permissions = this.getPermissionsForRole(user.role);

    // Access token
    const accessPayload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    });

    // Refresh token
    const tokenId = uuidv4();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenId,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private getPermissionsForRole(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'],
      admin: [
        'users.*',
        'contacts.*',
        'companies.*',
        'deals.*',
        'leads.*',
        'activities.*',
        'conversations.*',
        'reports.*',
        'settings.*',
        'pipelines.*',
      ],
      sales_manager: [
        'users.view',
        'contacts.*',
        'companies.*',
        'deals.*',
        'leads.*',
        'activities.*',
        'conversations.*',
        'reports.view',
      ],
      sales_rep: [
        'contacts.view',
        'contacts.create',
        'contacts.edit',
        'companies.view',
        'companies.create',
        'deals.view',
        'deals.create',
        'deals.edit',
        'leads.view',
        'leads.edit',
        'activities.*',
        'conversations.view',
        'conversations.respond',
      ],
    };

    return rolePermissions[role] || [];
  }
}
