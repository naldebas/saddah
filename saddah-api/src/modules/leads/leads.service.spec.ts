import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LeadStatus, LeadSource, PropertyType } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockLead = {
    id: 'lead-123',
    tenantId: mockTenantId,
    ownerId: mockUserId,
    firstName: 'أحمد',
    lastName: 'محمد',
    email: 'ahmed@example.com',
    phone: '+966501234567',
    whatsapp: '+966501234567',
    source: 'manual',
    sourceId: null,
    propertyType: 'apartment',
    budget: 500000,
    timeline: '3_months',
    location: 'الرياض',
    financingNeeded: true,
    notes: 'عميل مهتم',
    status: 'new',
    score: 75,
    scoreGrade: 'B',
    tags: ['مهم'],
    convertedAt: null,
    convertedToContactId: null,
    convertedToDealId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: mockUserId,
      firstName: 'محمد',
      lastName: 'علي',
    },
    scoreHistory: [],
  };

  const mockPrismaService = {
    lead: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    contact: {
      create: jest.fn(),
    },
    deal: {
      create: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
    },
    leadScoreHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a lead successfully', async () => {
      const createDto = {
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'ahmed@example.com',
        phone: '+966501234567',
        source: LeadSource.MANUAL,
        propertyType: PropertyType.APARTMENT,
        budget: 500000,
      };

      mockPrismaService.lead.create.mockResolvedValue(mockLead);

      const result = await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          ownerId: mockUserId,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });

    it('should use custom ownerId when provided', async () => {
      const customOwnerId = 'custom-owner-123';
      const createDto = {
        firstName: 'أحمد',
        ownerId: customOwnerId,
      };

      mockPrismaService.lead.create.mockResolvedValue({
        ...mockLead,
        ownerId: customOwnerId,
      });

      await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: customOwnerId,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated leads', async () => {
      const leads = [mockLead];
      mockPrismaService.lead.findMany.mockResolvedValue(leads);
      mockPrismaService.lead.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toEqual({
        data: leads,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { search: 'أحمد' });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: 'أحمد', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { status: LeadStatus.QUALIFIED });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LeadStatus.QUALIFIED,
          }),
        }),
      );
    });

    it('should filter by score range', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { minScore: 50, maxScore: 80 });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            score: { gte: 50, lte: 80 },
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(100);

      const result = await service.findAll(mockTenantId, { page: 3, limit: 10 });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return a lead by id', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      const result = await service.findOne(mockTenantId, 'lead-123');

      expect(mockPrismaService.lead.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'lead-123',
          tenantId: mockTenantId,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a lead successfully', async () => {
      const updateDto = {
        firstName: 'أحمد المعدل',
        budget: 600000,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLead,
        ...updateDto,
      });

      const result = await service.update(mockTenantId, 'lead-123', updateDto);

      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: updateDto,
        include: expect.any(Object),
      });
      expect(result.firstName).toBe('أحمد المعدل');
    });

    it('should throw NotFoundException when updating nonexistent lead', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'nonexistent-id', { firstName: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update lead status', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.QUALIFIED,
      });

      const result = await service.updateStatus(mockTenantId, 'lead-123', LeadStatus.QUALIFIED);

      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: { status: LeadStatus.QUALIFIED },
        include: expect.any(Object),
      });
      expect(result.status).toBe(LeadStatus.QUALIFIED);
    });
  });

  describe('score', () => {
    it('should update lead score and create history', async () => {
      const scoreDto = {
        score: 85,
        grade: 'A',
        factors: { budget: 30, timeline: 25, engagement: 30 },
      };

      const updatedLead = { ...mockLead, score: 85, scoreGrade: 'A' };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      // $transaction resolves the promises passed to it
      mockPrismaService.$transaction.mockImplementation((promises: Promise<any>[]) =>
        Promise.all(promises)
      );
      mockPrismaService.lead.update.mockResolvedValue(updatedLead);
      mockPrismaService.leadScoreHistory.create.mockResolvedValue({});

      const result = await service.score(mockTenantId, 'lead-123', scoreDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: {
          score: 85,
          scoreGrade: 'A',
        },
        include: expect.any(Object),
      });
      expect(result.score).toBe(85);
    });
  });

  describe('convert', () => {
    it('should convert lead to contact successfully', async () => {
      const convertDto = {
        companyId: 'company-123',
      };

      const mockContact = {
        id: 'contact-new',
        firstName: mockLead.firstName,
        lastName: mockLead.lastName,
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.contact.create.mockResolvedValue(mockContact);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.CONVERTED,
        convertedToContactId: mockContact.id,
      });

      const result = await service.convert(mockTenantId, 'lead-123', mockUserId, convertDto);

      expect(mockPrismaService.contact.create).toHaveBeenCalled();
      expect(result.contact).toEqual(mockContact);
      expect(result.deal).toBeNull();
    });

    it('should convert lead to contact and deal with pipeline', async () => {
      const convertDto = {
        pipelineId: 'pipeline-123',
        dealTitle: 'صفقة جديدة',
      };

      const mockContact = {
        id: 'contact-new',
        firstName: mockLead.firstName,
      };

      const mockStage = {
        id: 'stage-1',
        name: 'جديد',
        probability: 10,
      };

      const mockDeal = {
        id: 'deal-new',
        title: 'صفقة جديدة',
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.contact.create.mockResolvedValue(mockContact);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(mockStage);
      mockPrismaService.deal.create.mockResolvedValue(mockDeal);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.CONVERTED,
        convertedToContactId: mockContact.id,
        convertedToDealId: mockDeal.id,
      });

      const result = await service.convert(mockTenantId, 'lead-123', mockUserId, convertDto);

      expect(mockPrismaService.deal.create).toHaveBeenCalled();
      expect(result.contact).toEqual(mockContact);
      expect(result.deal).toEqual(mockDeal);
    });

    it('should throw BadRequestException when lead already converted', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.CONVERTED,
      });

      await expect(
        service.convert(mockTenantId, 'lead-123', mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pipeline has no stages', async () => {
      const convertDto = {
        pipelineId: 'pipeline-123',
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.contact.create.mockResolvedValue({ id: 'contact-new' });
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.convert(mockTenantId, 'lead-123', mockUserId, convertDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a lead', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.delete.mockResolvedValue(mockLead);

      const result = await service.remove(mockTenantId, 'lead-123');

      expect(mockPrismaService.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
      });
      expect(result).toEqual({ message: 'تم حذف العميل المحتمل بنجاح' });
    });

    it('should throw NotFoundException when removing nonexistent lead', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return lead statistics', async () => {
      mockPrismaService.lead.count
        .mockResolvedValueOnce(100) // totalLeads
        .mockResolvedValueOnce(30)  // newLeads
        .mockResolvedValueOnce(40)  // qualifiedLeads
        .mockResolvedValueOnce(20); // convertedLeads

      mockPrismaService.lead.groupBy
        .mockResolvedValueOnce([
          { source: 'manual', _count: { id: 50 } },
          { source: 'whatsapp_bot', _count: { id: 30 } },
        ])
        .mockResolvedValueOnce([
          { propertyType: 'apartment', _count: { id: 60 } },
          { propertyType: 'villa', _count: { id: 40 } },
        ]);

      mockPrismaService.lead.aggregate.mockResolvedValue({
        _avg: { score: 72.5 },
      });

      const result = await service.getStatistics(mockTenantId);

      expect(result).toEqual({
        total: 100,
        byStatus: {
          new: 30,
          qualified: 40,
          converted: 20,
        },
        bySource: [
          { source: 'manual', count: 50 },
          { source: 'whatsapp_bot', count: 30 },
        ],
        byPropertyType: [
          { propertyType: 'apartment', count: 60 },
          { propertyType: 'villa', count: 40 },
        ],
        averageScore: 73,
        conversionRate: 20,
      });
    });

    it('should handle zero leads gracefully', async () => {
      mockPrismaService.lead.count.mockResolvedValue(0);
      mockPrismaService.lead.groupBy.mockResolvedValue([]);
      mockPrismaService.lead.aggregate.mockResolvedValue({
        _avg: { score: null },
      });

      const result = await service.getStatistics(mockTenantId);

      expect(result.total).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.averageScore).toBe(0);
    });
  });
});
