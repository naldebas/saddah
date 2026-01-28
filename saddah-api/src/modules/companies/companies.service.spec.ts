import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';

  const mockCompany = {
    id: 'company-123',
    tenantId: mockTenantId,
    name: 'شركة التطوير العقاري',
    industry: 'تطوير عقاري',
    website: 'https://example.com',
    phone: '+966501234567',
    email: 'info@example.com',
    address: 'حي الملقا',
    city: 'الرياض',
    country: 'SA',
    size: 'medium',
    tags: ['عميل_مهم'],
    customFields: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      contacts: 5,
      deals: 3,
    },
  };

  const mockPrismaService = {
    company: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a company successfully', async () => {
      const createDto = {
        name: 'شركة التطوير العقاري',
        industry: 'تطوير عقاري',
        city: 'الرياض',
      };

      mockPrismaService.company.create.mockResolvedValue(mockCompany);

      const result = await service.create(mockTenantId, createDto);

      expect(mockPrismaService.company.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          name: createDto.name,
          industry: createDto.industry,
          website: undefined,
          phone: undefined,
          email: undefined,
          address: undefined,
          city: createDto.city,
          country: 'SA',
          size: undefined,
          tags: [],
          customFields: {},
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockCompany);
    });

    it('should use custom country when provided', async () => {
      const createDto = {
        name: 'شركة إماراتية',
        country: 'AE',
      };

      mockPrismaService.company.create.mockResolvedValue({
        ...mockCompany,
        country: 'AE',
      });

      await service.create(mockTenantId, createDto);

      expect(mockPrismaService.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'AE',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated companies', async () => {
      const companies = [mockCompany];
      mockPrismaService.company.findMany.mockResolvedValue(companies);
      mockPrismaService.company.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toEqual({
        data: companies,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { search: 'شركة' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'شركة', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('should filter by industry', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { industry: 'تطوير عقاري' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            industry: 'تطوير عقاري',
          }),
        }),
      );
    });

    it('should filter by city', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { city: 'الرياض' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'الرياض',
          }),
        }),
      );
    });

    it('should filter by size', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { size: 'large' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            size: 'large',
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(50);

      const result = await service.findAll(mockTenantId, { page: 2, limit: 10 });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
    });
  });

  describe('findOne', () => {
    it('should return a company by id', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);

      const result = await service.findOne(mockTenantId, 'company-123');

      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'company-123',
          tenantId: mockTenantId,
          isActive: true,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockCompany);
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a company successfully', async () => {
      const updateDto = {
        name: 'شركة التطوير المتقدم',
        phone: '+966509876543',
      };

      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({
        ...mockCompany,
        ...updateDto,
      });

      const result = await service.update(mockTenantId, 'company-123', updateDto);

      expect(mockPrismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: expect.objectContaining({
          name: updateDto.name,
          phone: updateDto.phone,
        }),
        include: expect.any(Object),
      });
      expect(result.name).toBe('شركة التطوير المتقدم');
    });

    it('should throw NotFoundException when updating nonexistent company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'nonexistent-id', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompany);
      mockPrismaService.company.update.mockResolvedValue({
        ...mockCompany,
        isActive: false,
      });

      const result = await service.remove(mockTenantId, 'company-123');

      expect(mockPrismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-123' },
        data: { isActive: false },
      });
      expect(result).toEqual({ message: 'تم حذف الشركة بنجاح' });
    });

    it('should throw NotFoundException when removing nonexistent company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getIndustries', () => {
    it('should return distinct industries', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([
        { industry: 'تطوير عقاري' },
        { industry: 'وساطة عقارية' },
        { industry: null },
      ]);

      const result = await service.getIndustries(mockTenantId);

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        select: { industry: true },
        distinct: ['industry'],
      });
      expect(result).toEqual(['تطوير عقاري', 'وساطة عقارية']);
    });
  });

  describe('getCities', () => {
    it('should return distinct cities', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([
        { city: 'الرياض' },
        { city: 'جدة' },
        { city: null },
      ]);

      const result = await service.getCities(mockTenantId);

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        select: { city: true },
        distinct: ['city'],
      });
      expect(result).toEqual(['الرياض', 'جدة']);
    });
  });
});
