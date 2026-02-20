import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockUser, createMockUsers } from '../../../test/utils/mock-factory';
import { UserRole } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const tenantId = 'tenant-uuid';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user with valid role', async () => {
      const roles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES];

      for (const role of roles) {
        prisma.user.findUnique.mockResolvedValue(null); // No existing user
        prisma.user.create.mockResolvedValue(createMockUser({ tenantId, role }));

        const result = await service.create(tenantId, {
          email: `${role}@saddah.io`,
          password: 'TestPassword@123',
          firstName: 'Test',
          lastName: 'User',
          role,
        });

        expect(result.role).toBe(role);
      }
    });

    it('should hash password on create', async () => {
      const password = 'TestPassword@123';
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation((args: any) => {
        // Verify password is hashed
        expect(args.data.passwordHash).not.toBe(password);
        expect(args.data.passwordHash.startsWith('$2b$')).toBe(true);
        return createMockUser({ tenantId });
      });

      await service.create(tenantId, {
        email: 'new@saddah.io',
        password,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SALES,
      });

      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should prevent duplicate emails within tenant', async () => {
      const existingUser = createMockUser({ tenantId, email: 'existing@saddah.io' });
      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.create(tenantId, {
          email: 'existing@saddah.io',
          password: 'TestPassword@123',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.SALES,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same email in different tenant', async () => {
      const otherTenantId = 'other-tenant-uuid';
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createMockUser({ tenantId: otherTenantId }));

      const result = await service.create(otherTenantId, {
        email: 'user@saddah.io',
        password: 'TestPassword@123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SALES,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: { tenantId: otherTenantId, email: 'user@saddah.io' },
        },
      });
      expect(result).toBeDefined();
    });

    it('should set default language to Arabic', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation((args: any) => {
        expect(args.data.language).toBe('ar');
        return createMockUser({ tenantId });
      });

      await service.create(tenantId, {
        email: 'new@saddah.io',
        password: 'TestPassword@123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.SALES,
      });
    });
  });

  describe('findAll', () => {
    it('should list users by tenant', async () => {
      const users = createMockUsers(5, { tenantId });
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(5);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, isActive: true },
        }),
      );
    });

    it('should only return active users', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll(tenantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const user = createMockUser({ tenantId });
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne(tenantId, user.id);

      expect(result.id).toBe(user.id);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce tenant isolation', async () => {
      const otherTenantUser = createMockUser({ tenantId: 'other-tenant' });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, otherTenantUser.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: otherTenantUser.id, tenantId, isActive: true },
        select: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const user = createMockUser({ tenantId });
      const updatedUser = { ...user, firstName: 'محمد', lastName: 'الأحمد' };

      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(tenantId, user.id, {
        firstName: 'محمد',
        lastName: 'الأحمد',
      });

      expect(result.firstName).toBe('محمد');
      expect(result.lastName).toBe('الأحمد');
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      const user = createMockUser({ tenantId, isActive: true });
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, isActive: false });

      const result = await service.remove(tenantId, user.id);

      expect(result.message).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { isActive: false },
      });
    });

    it('should not hard delete user', async () => {
      const user = createMockUser({ tenantId });
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, isActive: false });

      await service.remove(tenantId, user.id);

      // Verify delete was NOT called, only update
      expect(prisma.user.delete).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = createMockUser({ tenantId });
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile(user.id);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const user = createMockUser({ tenantId });
      const updatedUser = { ...user, phone: '+966501234567' };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(user.id, {
        phone: '+966501234567',
      });

      expect(result.phone).toBe('+966501234567');
    });
  });

  describe('changePassword', () => {
    it('should change password with validation', async () => {
      const currentPassword = 'OldPassword@123';
      const newPassword = 'NewPassword@456';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);

      const user = createMockUser({ tenantId, passwordHash: hashedCurrentPassword });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.changePassword(user.id, {
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      });

      expect(result.message).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { passwordHash: expect.stringMatching(/^\$2b\$/) },
      });
    });

    it('should reject when passwords do not match', async () => {
      await expect(
        service.changePassword('user-id', {
          currentPassword: 'current',
          newPassword: 'new123',
          confirmPassword: 'different',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject incorrect current password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const user = createMockUser({ tenantId, passwordHash: hashedPassword });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.changePassword(user.id, {
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword@456',
          confirmPassword: 'NewPassword@456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash new password', async () => {
      const currentPassword = 'OldPassword@123';
      const newPassword = 'NewPassword@456';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);

      const user = createMockUser({ tenantId, passwordHash: hashedCurrentPassword });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockImplementation((args: any) => {
        // Verify new password is hashed
        expect(args.data.passwordHash).not.toBe(newPassword);
        expect(args.data.passwordHash.startsWith('$2b$')).toBe(true);
        return user;
      });

      await service.changePassword(user.id, {
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      });

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar URL', async () => {
      const user = createMockUser({ tenantId });
      const avatarUrl = 'https://storage.saddah.io/avatars/user123.jpg';

      prisma.user.update.mockResolvedValue({ ...user, avatar: avatarUrl });

      const result = await service.updateAvatar(user.id, avatarUrl);

      expect(result.avatar).toBe(avatarUrl);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { avatar: avatarUrl },
        select: { id: true, avatar: true },
      });
    });
  });

  describe('tenant isolation', () => {
    it('should not return users from other tenants', async () => {
      const otherTenantId = 'other-tenant-uuid';
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll(otherTenantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: otherTenantId }),
        }),
      );
    });
  });
});
