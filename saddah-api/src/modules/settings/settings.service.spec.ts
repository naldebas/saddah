import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ThemePreference } from './dto/user-preferences.dto';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockTenant = {
    id: mockTenantId,
    name: 'شركة صدى',
    domain: 'saddah.io',
    plan: 'professional',
    settings: {
      companyName: 'شركة صدى العقارية',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@saddah.io',
    firstName: 'أحمد',
    lastName: 'محمد',
    language: 'ar',
    tenantId: mockTenantId,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenantSettings', () => {
    it('should return tenant settings', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.getTenantSettings(mockTenantId);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTenantSettings('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTenantSettings', () => {
    const updateDto = {
      companyName: 'شركة صدى المحدثة',
      timezone: 'Asia/Dubai',
      currency: 'AED',
    };

    it('should update tenant settings for admin', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        name: updateDto.companyName,
        settings: { ...mockTenant.settings, ...updateDto },
      });

      const result = await service.updateTenantSettings(
        mockTenantId,
        'admin',
        updateDto,
      );

      expect(prisma.tenant.update).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.companyName);
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      await expect(
        service.updateTenantSettings(mockTenantId, 'agent', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTenantSettings('invalid-id', 'admin', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update business hours', async () => {
      const businessHoursDto = {
        businessHours: {
          start: '09:00',
          end: '17:00',
          workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        },
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        settings: { ...mockTenant.settings, businessHours: businessHoursDto.businessHours },
      });

      const result = await service.updateTenantSettings(
        mockTenantId,
        'admin',
        businessHoursDto,
      );

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              businessHours: expect.any(Object),
            }),
          }),
        }),
      );
    });

    it('should update branding settings', async () => {
      const brandingDto = {
        branding: {
          logo: 'https://example.com/logo.png',
          primaryColor: '#0D9488',
          secondaryColor: '#14B8A6',
        },
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        settings: { ...mockTenant.settings, branding: brandingDto.branding },
      });

      await service.updateTenantSettings(mockTenantId, 'admin', brandingDto);

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              branding: expect.any(Object),
            }),
          }),
        }),
      );
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return notification preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getNotificationPreferences(mockUserId);

      expect(result).toHaveProperty('emailNotifications');
      expect(result).toHaveProperty('pushNotifications');
      expect(result).toHaveProperty('dealUpdates');
      expect(result).toHaveProperty('newLeads');
      expect(result).toHaveProperty('activityReminders');
      expect(result).toHaveProperty('dailyDigest');
      expect(result).toHaveProperty('weeklyReport');
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getNotificationPreferences('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNotificationPreferences', () => {
    const updateDto = {
      emailNotifications: false,
      pushNotifications: true,
      dailyDigest: true,
    };

    it('should update notification preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.updateNotificationPreferences(
        mockUserId,
        updateDto,
      );

      expect(result.emailNotifications).toBe(false);
      expect(result.pushNotifications).toBe(true);
      expect(result.dailyDigest).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences('invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toHaveProperty('theme', ThemePreference.LIGHT);
      expect(result).toHaveProperty('language', 'ar');
      expect(result).toHaveProperty('accentColor');
      expect(result).toHaveProperty('tableViewDensity');
      expect(result).toHaveProperty('defaultDealView');
      expect(result).toHaveProperty('defaultPageSize');
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserPreferences('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserPreferences', () => {
    const updateDto = {
      theme: ThemePreference.DARK,
      language: 'en',
      defaultPageSize: 50,
    };

    it('should update user preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        language: 'en',
      });

      const result = await service.updateUserPreferences(mockUserId, updateDto);

      expect(result.theme).toBe(ThemePreference.DARK);
      expect(result.language).toBe('en');
      expect(result.defaultPageSize).toBe(50);
    });

    it('should update language in database when provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        language: 'en',
      });

      await service.updateUserPreferences(mockUserId, { language: 'en' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { language: 'en' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUserPreferences('invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlanInfo', () => {
    it('should return plan info with usage stats', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        plan: 'professional',
        createdAt: new Date('2024-01-01'),
        _count: {
          users: 5,
          contacts: 500,
          deals: 100,
        },
      });

      const result = await service.getPlanInfo(mockTenantId);

      expect(result).toHaveProperty('plan', 'professional');
      expect(result.usage).toEqual({
        users: 5,
        contacts: 500,
        deals: 100,
      });
      expect(result.limits).toEqual({
        users: 20,
        contacts: 10000,
        deals: 5000,
      });
    });

    it('should return trial info with trial dates', async () => {
      const createdAt = new Date('2024-01-01');
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        plan: 'trial',
        createdAt,
        _count: {
          users: 2,
          contacts: 50,
          deals: 10,
        },
      });

      const result = await service.getPlanInfo(mockTenantId);

      expect(result.plan).toBe('trial');
      expect(result.trialStartDate).toEqual(createdAt);
      expect(result.trialEndDate).toBeDefined();
    });

    it('should return unlimited for enterprise plan', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        plan: 'enterprise',
        createdAt: new Date(),
        _count: {
          users: 100,
          contacts: 50000,
          deals: 10000,
        },
      });

      const result = await service.getPlanInfo(mockTenantId);

      expect(result.limits.users).toBe('غير محدود');
      expect(result.limits.contacts).toBe('غير محدود');
      expect(result.limits.deals).toBe('غير محدود');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPlanInfo('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
