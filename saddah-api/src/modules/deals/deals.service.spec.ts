import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('DealsService', () => {
  let service: DealsService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockStage = {
    id: 'stage-1',
    name: 'جديد',
    color: '#3B82F6',
    probability: 10,
    order: 1,
    pipelineId: 'pipeline-123',
  };

  const mockPipeline = {
    id: 'pipeline-123',
    name: 'مسار المبيعات الأساسي',
    tenantId: mockTenantId,
    stages: [mockStage],
  };

  const mockDeal = {
    id: 'deal-123',
    tenantId: mockTenantId,
    ownerId: mockUserId,
    pipelineId: 'pipeline-123',
    stageId: 'stage-1',
    contactId: 'contact-123',
    companyId: 'company-123',
    title: 'صفقة شقة الرياض',
    value: 500000,
    currency: 'SAR',
    probability: 10,
    status: 'open',
    expectedCloseDate: new Date('2024-06-01'),
    tags: ['سكني'],
    customFields: {},
    closedAt: null,
    lostReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: mockUserId,
      firstName: 'محمد',
      lastName: 'علي',
    },
    contact: {
      id: 'contact-123',
      firstName: 'أحمد',
      lastName: 'محمد',
    },
    company: {
      id: 'company-123',
      name: 'شركة الإعمار',
    },
    stage: mockStage,
    pipeline: {
      id: 'pipeline-123',
      name: 'مسار المبيعات الأساسي',
    },
  };

  const mockPrismaService = {
    deal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    pipeline: {
      findFirst: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a deal successfully', async () => {
      const createDto = {
        pipelineId: 'pipeline-123',
        stageId: 'stage-1',
        title: 'صفقة شقة الرياض',
        value: 500000,
        contactId: 'contact-123',
      };

      mockPrismaService.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(mockStage);
      mockPrismaService.deal.create.mockResolvedValue(mockDeal);

      const result = await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.pipeline.findFirst).toHaveBeenCalledWith({
        where: { id: createDto.pipelineId, tenantId: mockTenantId },
      });
      expect(mockPrismaService.pipelineStage.findFirst).toHaveBeenCalledWith({
        where: { id: createDto.stageId, pipelineId: createDto.pipelineId },
      });
      expect(mockPrismaService.deal.create).toHaveBeenCalled();
      expect(result).toEqual(mockDeal);
    });

    it('should throw NotFoundException when pipeline not found', async () => {
      mockPrismaService.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockTenantId, mockUserId, {
          pipelineId: 'nonexistent',
          stageId: 'stage-1',
          title: 'test',
          value: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when stage not found', async () => {
      mockPrismaService.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockTenantId, mockUserId, {
          pipelineId: 'pipeline-123',
          stageId: 'nonexistent',
          title: 'test',
          value: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use stage probability when not provided', async () => {
      const createDto = {
        pipelineId: 'pipeline-123',
        stageId: 'stage-1',
        title: 'صفقة جديدة',
        value: 100000,
      };

      mockPrismaService.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(mockStage);
      mockPrismaService.deal.create.mockResolvedValue(mockDeal);

      await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: mockStage.probability,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated deals', async () => {
      const deals = [mockDeal];
      mockPrismaService.deal.findMany.mockResolvedValue(deals);
      mockPrismaService.deal.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toEqual({
        data: deals,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter on title', async () => {
      mockPrismaService.deal.findMany.mockResolvedValue([]);
      mockPrismaService.deal.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { search: 'شقة' });

      expect(mockPrismaService.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'شقة', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by pipelineId', async () => {
      mockPrismaService.deal.findMany.mockResolvedValue([]);
      mockPrismaService.deal.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { pipelineId: 'pipeline-123' });

      expect(mockPrismaService.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pipelineId: 'pipeline-123',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.deal.findMany.mockResolvedValue([]);
      mockPrismaService.deal.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { status: 'won' });

      expect(mockPrismaService.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'won',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a deal by id', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);

      const result = await service.findOne(mockTenantId, 'deal-123');

      expect(mockPrismaService.deal.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'deal-123',
          tenantId: mockTenantId,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockDeal);
    });

    it('should throw NotFoundException when deal not found', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a deal successfully', async () => {
      const updateDto = {
        title: 'صفقة محدثة',
        value: 600000,
      };

      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        ...updateDto,
      });

      const result = await service.update(mockTenantId, 'deal-123', updateDto);

      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: expect.objectContaining({
          title: updateDto.title,
          value: updateDto.value,
        }),
        include: expect.any(Object),
      });
      expect(result.title).toBe('صفقة محدثة');
    });

    it('should throw BadRequestException when updating to invalid stage', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'deal-123', { stageId: 'invalid-stage' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveStage', () => {
    it('should move deal to another stage successfully', async () => {
      const newStage = {
        ...mockStage,
        id: 'stage-2',
        name: 'مؤهل',
        probability: 30,
      };

      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(newStage);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        stageId: newStage.id,
        probability: newStage.probability,
      });

      const result = await service.moveStage(mockTenantId, 'deal-123', {
        stageId: 'stage-2',
      });

      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: {
          stageId: 'stage-2',
          probability: 30,
        },
        include: expect.any(Object),
      });
      expect(result.stageId).toBe('stage-2');
    });

    it('should throw BadRequestException when stage not in pipeline', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.moveStage(mockTenantId, 'deal-123', { stageId: 'invalid-stage' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closeDeal', () => {
    it('should close deal as won', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        status: 'won',
        probability: 100,
        closedAt: expect.any(Date),
      });

      const result = await service.closeDeal(mockTenantId, 'deal-123', {
        status: 'won',
      });

      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: expect.objectContaining({
          status: 'won',
          probability: 100,
          lostReason: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should close deal as lost with reason', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        status: 'lost',
        probability: 0,
        lostReason: 'السعر مرتفع',
      });

      const result = await service.closeDeal(mockTenantId, 'deal-123', {
        status: 'lost',
        lostReason: 'السعر مرتفع',
      });

      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: expect.objectContaining({
          status: 'lost',
          probability: 0,
          lostReason: 'السعر مرتفع',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when closing as lost without reason', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);

      await expect(
        service.closeDeal(mockTenantId, 'deal-123', { status: 'lost' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reopenDeal', () => {
    it('should reopen a closed deal', async () => {
      const closedDeal = {
        ...mockDeal,
        status: 'won',
        closedAt: new Date(),
      };

      mockPrismaService.deal.findFirst.mockResolvedValue(closedDeal);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        status: 'open',
        closedAt: null,
        probability: mockStage.probability,
      });

      const result = await service.reopenDeal(mockTenantId, 'deal-123');

      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: expect.objectContaining({
          status: 'open',
          closedAt: null,
          lostReason: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when deal is already open', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);

      await expect(
        service.reopenDeal(mockTenantId, 'deal-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a deal', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrismaService.deal.delete.mockResolvedValue(mockDeal);

      const result = await service.remove(mockTenantId, 'deal-123');

      expect(mockPrismaService.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
      });
      expect(result).toEqual({ message: 'تم حذف الصفقة بنجاح' });
    });

    it('should throw NotFoundException when removing nonexistent deal', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getKanbanBoard', () => {
    it('should return kanban board data', async () => {
      const deals = [mockDeal];
      mockPrismaService.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrismaService.deal.findMany.mockResolvedValue(deals);

      const result = await service.getKanbanBoard(mockTenantId, 'pipeline-123');

      expect(result.pipeline).toEqual({
        id: mockPipeline.id,
        name: mockPipeline.name,
      });
      expect(result.stages).toHaveLength(1);
      expect(result.summary.totalDeals).toBe(1);
      expect(result.summary.totalValue).toBe(500000);
    });

    it('should throw NotFoundException when pipeline not found', async () => {
      mockPrismaService.pipeline.findFirst.mockResolvedValue(null);

      await expect(
        service.getKanbanBoard(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return deal statistics', async () => {
      mockPrismaService.deal.aggregate
        .mockResolvedValueOnce({ _count: 10, _sum: { value: 5000000 } }) // open
        .mockResolvedValueOnce({ _count: 5, _sum: { value: 3000000 } })  // won
        .mockResolvedValueOnce({ _count: 3, _sum: { value: 1000000 } }); // lost

      const result = await service.getStatistics(mockTenantId);

      expect(result).toEqual({
        open: { count: 10, value: 5000000 },
        won: { count: 5, value: 3000000 },
        lost: { count: 3, value: 1000000 },
        winRate: 62.5, // 5 / (5+3) = 62.5%
      });
    });

    it('should handle zero deals gracefully', async () => {
      mockPrismaService.deal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { value: null },
      });

      const result = await service.getStatistics(mockTenantId);

      expect(result.open.count).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should filter by pipelineId when provided', async () => {
      mockPrismaService.deal.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { value: null },
      });

      await service.getStatistics(mockTenantId, 'pipeline-123');

      expect(mockPrismaService.deal.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pipelineId: 'pipeline-123',
          }),
        }),
      );
    });
  });
});
