import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockUserWithTenant,
  createMockRefreshToken,
} from '../../../test/utils/mock-factory';
import {
  createMockJwtService,
  createMockConfigService,
} from '../../../test/utils/test-helpers';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser = createMockUserWithTenant(
    { email: 'test@saddah.io', passwordHash: '' },
    { isActive: true },
  );

  beforeEach(async () => {
    // Hash password for mock user
    const hashedPassword = await bcrypt.hash('TestPassword@123', 10);
    mockUser.passwordHash = hashedPassword;

    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    jwtService = createMockJwtService();
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken({ userId: mockUser.id }));

      const result = await service.login({
        email: 'test@saddah.io',
        password: 'TestPassword@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@saddah.io');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@saddah.io', isActive: true },
        include: { tenant: true },
      });
    });

    it('should reject invalid email (user not found)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@email.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@saddah.io', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when tenant is inactive', async () => {
      const inactiveTenantUser = createMockUserWithTenant(
        { email: 'test@saddah.io', passwordHash: mockUser.passwordHash },
        { isActive: false },
      );
      prisma.user.findFirst.mockResolvedValue(inactiveTenantUser);

      await expect(
        service.login({ email: 'test@saddah.io', password: 'TestPassword@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate valid JWT tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken({ userId: mockUser.id }));

      const result = await service.login({
        email: 'test@saddah.io',
        password: 'TestPassword@123',
      });

      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should update last login timestamp', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken({ userId: mockUser.id }));

      await service.login({
        email: 'test@saddah.io',
        password: 'TestPassword@123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens correctly', async () => {
      const mockRefreshToken = createMockRefreshToken({ userId: mockUser.id });
      const mockPayload = { sub: mockUser.id, tokenId: mockRefreshToken.id };

      jwtService.verify.mockReturnValue(mockPayload);
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken({ userId: mockUser.id }));

      const result = await service.refreshToken(mockRefreshToken.token);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = createMockRefreshToken({
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refreshToken(expiredToken.token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when token not found in database', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid-but-deleted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject when user is inactive', async () => {
      const mockRefreshToken = createMockRefreshToken({ userId: mockUser.id });
      const inactiveUser = createMockUserWithTenant(
        { ...mockUser, isActive: false },
        { isActive: true },
      );

      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(mockRefreshToken.token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete old refresh token on rotation', async () => {
      const mockRefreshToken = createMockRefreshToken({ userId: mockUser.id });

      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken({ userId: mockUser.id }));

      await service.refreshToken(mockRefreshToken.token);

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
      });
    });
  });

  describe('logout', () => {
    it('should invalidate specific refresh token', async () => {
      const mockToken = 'refresh-token-123';
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout(mockUser.id, mockToken);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('should invalidate all refresh tokens when no token provided', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logout(mockUser.id);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if valid and active', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        isActive: true,
        tenant: { isActive: true },
      });

      const result = await service.validateUser(mockUser.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockUser.id);
    });

    it('should return null for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
        tenant: { isActive: true },
      });

      const result = await service.validateUser(mockUser.id);

      expect(result).toBeNull();
    });

    it('should return null for user with inactive tenant', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: true,
        tenant: { isActive: false },
      });

      const result = await service.validateUser(mockUser.id);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });

    it('should validate tenant isolation', async () => {
      const otherTenantUser = createMockUserWithTenant(
        { tenantId: 'other-tenant-id' },
        { id: 'other-tenant-id' },
      );

      prisma.user.findUnique.mockResolvedValue({
        ...otherTenantUser,
        isActive: true,
        tenant: { isActive: true },
      });

      const result = await service.validateUser(otherTenantUser.id);

      expect(result).not.toBeNull();
      expect(result.tenantId).toBe('other-tenant-id');
    });
  });

  describe('password hashing', () => {
    it('should use bcrypt for password comparison', async () => {
      const password = 'TestPassword@123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const userWithHash = createMockUserWithTenant(
        { passwordHash: hashedPassword },
        { isActive: true },
      );

      prisma.user.findFirst.mockResolvedValue(userWithHash);
      prisma.user.update.mockResolvedValue(userWithHash);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken());

      const result = await service.login({ email: userWithHash.email, password });

      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('role permissions', () => {
    it('should include permissions in JWT payload for admin', async () => {
      const adminUser = createMockUserWithTenant(
        { ...mockUser, role: 'admin', passwordHash: mockUser.passwordHash },
        { isActive: true },
      );

      prisma.user.findFirst.mockResolvedValue(adminUser);
      prisma.user.update.mockResolvedValue(adminUser);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken());

      await service.login({ email: adminUser.email, password: 'TestPassword@123' });

      // Verify JWT sign was called with permissions
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
          permissions: expect.arrayContaining(['users.*']),
        }),
        expect.any(Object),
      );
    });

    it('should include limited permissions for sales_rep', async () => {
      const salesRepUser = createMockUserWithTenant(
        { ...mockUser, role: 'sales_rep', passwordHash: mockUser.passwordHash },
        { isActive: true },
      );

      prisma.user.findFirst.mockResolvedValue(salesRepUser);
      prisma.user.update.mockResolvedValue(salesRepUser);
      prisma.refreshToken.create.mockResolvedValue(createMockRefreshToken());

      await service.login({ email: salesRepUser.email, password: 'TestPassword@123' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'sales_rep',
          permissions: expect.arrayContaining(['contacts.view']),
        }),
        expect.any(Object),
      );
    });
  });
});
