import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportPeriod } from './dto/report-query.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockPrismaService = {
      deal: {
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      lead: {
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      activity: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      contact: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      pipelineStage: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSalesReport', () => {
    const mockQuery = { period: ReportPeriod.THIS_MONTH };

    beforeEach(() => {
      (prisma.deal.count as jest.Mock).mockResolvedValue(100);
      (prisma.deal.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _count: { id: 40 }, _sum: { value: 5000000 } }) // won
        .mockResolvedValueOnce({ _count: { id: 20 }, _sum: { value: 2000000 } }) // lost
        .mockResolvedValueOnce({ _count: { id: 40 }, _sum: { value: 4000000 } }); // open
      (prisma.deal.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { stageId: 'stage-1', _count: { id: 20 }, _sum: { value: 2000000 } },
          { stageId: 'stage-2', _count: { id: 20 }, _sum: { value: 2000000 } },
        ]) // by stage
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _count: { id: 20 }, _sum: { value: 3000000 } },
          { ownerId: 'user-2', _count: { id: 20 }, _sum: { value: 2000000 } },
        ]); // by user
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([
        { id: 'stage-1', name: 'مرحلة 1', color: '#3B82F6' },
        { id: 'stage-2', name: 'مرحلة 2', color: '#10B981' },
      ]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', firstName: 'أحمد', lastName: 'محمد' },
        { id: 'user-2', firstName: 'سارة', lastName: 'أحمد' },
      ]);
    });

    it('should return sales report with correct structure', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('byStage');
      expect(result).toHaveProperty('byUser');
    });

    it('should calculate correct summary values', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      expect(result.summary.totalDeals).toBe(100);
      expect(result.summary.wonDeals).toBe(40);
      expect(result.summary.lostDeals).toBe(20);
      expect(result.summary.openDeals).toBe(40);
      expect(result.summary.wonValue).toBe(5000000);
    });

    it('should calculate conversion rate correctly', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      // (40 won / (40 won + 20 lost)) * 100 = 66.7%
      expect(result.summary.conversionRate).toBeCloseTo(66.7, 0);
    });

    it('should calculate average deal value correctly', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      // 5000000 / 40 = 125000
      expect(result.summary.avgDealValue).toBe(125000);
    });

    it('should return deals grouped by stage', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      expect(result.byStage).toHaveLength(2);
      expect(result.byStage[0]).toHaveProperty('stageId');
      expect(result.byStage[0]).toHaveProperty('stageName');
      expect(result.byStage[0]).toHaveProperty('count');
      expect(result.byStage[0]).toHaveProperty('value');
    });

    it('should return deals grouped by user sorted by value', async () => {
      const result = await service.getSalesReport(mockTenantId, mockQuery);

      expect(result.byUser).toHaveLength(2);
      expect(result.byUser[0].totalValue).toBeGreaterThanOrEqual(result.byUser[1].totalValue);
    });

    it('should filter by user when userId is provided', async () => {
      await service.getSalesReport(mockTenantId, { ...mockQuery, userId: mockUserId });

      expect(prisma.deal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by pipeline when pipelineId is provided', async () => {
      const pipelineId = 'pipeline-123';
      await service.getSalesReport(mockTenantId, { ...mockQuery, pipelineId });

      expect(prisma.deal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pipelineId,
          }),
        }),
      );
    });
  });

  describe('getLeadsReport', () => {
    const mockQuery = { period: ReportPeriod.THIS_MONTH };

    beforeEach(() => {
      (prisma.lead.count as jest.Mock)
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(50); // converted
      (prisma.lead.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { status: 'new', _count: { id: 80 } },
          { status: 'contacted', _count: { id: 70 } },
          { status: 'qualified', _count: { id: 50 } },
        ]) // by status
        .mockResolvedValueOnce([
          { source: 'website', _count: { id: 100 } },
          { source: 'whatsapp', _count: { id: 60 } },
          { source: 'referral', _count: { id: 40 } },
        ]) // by source
        .mockResolvedValueOnce([
          { scoreGrade: 'A', _count: { id: 30 } },
          { scoreGrade: 'B', _count: { id: 70 } },
          { scoreGrade: 'C', _count: { id: 100 } },
        ]); // by grade
      (prisma.lead.aggregate as jest.Mock).mockResolvedValue({
        _avg: { score: 65 },
      });
    });

    it('should return leads report with correct structure', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('bySource');
      expect(result).toHaveProperty('byGrade');
    });

    it('should calculate correct summary values', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      expect(result.summary.totalLeads).toBe(200);
      expect(result.summary.convertedLeads).toBe(50);
      expect(result.summary.avgScore).toBe(65);
    });

    it('should calculate conversion rate correctly', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      // (50 / 200) * 100 = 25%
      expect(result.summary.conversionRate).toBe(25);
    });

    it('should return leads grouped by status with Arabic labels', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      expect(result.byStatus.length).toBeGreaterThan(0);
      const newStatus = result.byStatus.find(s => s.status === 'new');
      expect(newStatus?.statusLabel).toBe('جديد');
    });

    it('should return leads grouped by source with Arabic labels', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      expect(result.bySource.length).toBeGreaterThan(0);
      const websiteSource = result.bySource.find(s => s.source === 'website');
      expect(websiteSource?.sourceLabel).toBe('الموقع الإلكتروني');
    });

    it('should calculate percentages correctly', async () => {
      const result = await service.getLeadsReport(mockTenantId, mockQuery);

      // Website: (100 / 200) * 100 = 50%
      const websiteSource = result.bySource.find(s => s.source === 'website');
      expect(websiteSource?.percentage).toBe(50);
    });
  });

  describe('getActivitiesReport', () => {
    const mockQuery = { period: ReportPeriod.THIS_WEEK };

    beforeEach(() => {
      (prisma.activity.count as jest.Mock)
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(10); // overdue
      (prisma.activity.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { type: 'call', _count: { id: 50 } },
          { type: 'meeting', _count: { id: 30 } },
          { type: 'task', _count: { id: 70 } },
        ]) // by type
        .mockResolvedValueOnce([
          { createdById: 'user-1', _count: { id: 80 } },
          { createdById: 'user-2', _count: { id: 70 } },
        ]) // by user
        .mockResolvedValueOnce([
          { createdById: 'user-1', _count: { id: 60 } },
          { createdById: 'user-2', _count: { id: 40 } },
        ]); // completed by user
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', firstName: 'أحمد', lastName: 'محمد' },
        { id: 'user-2', firstName: 'سارة', lastName: 'أحمد' },
      ]);
    });

    it('should return activities report with correct structure', async () => {
      const result = await service.getActivitiesReport(mockTenantId, mockQuery);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('byUser');
    });

    it('should calculate correct summary values', async () => {
      const result = await service.getActivitiesReport(mockTenantId, mockQuery);

      expect(result.summary.totalActivities).toBe(150);
      expect(result.summary.completedActivities).toBe(100);
      expect(result.summary.overdueActivities).toBe(10);
    });

    it('should calculate completion rate correctly', async () => {
      const result = await service.getActivitiesReport(mockTenantId, mockQuery);

      // (100 / 150) * 100 = 66.7%
      expect(result.summary.completionRate).toBeCloseTo(66.7, 0);
    });

    it('should return activities grouped by type with Arabic labels', async () => {
      const result = await service.getActivitiesReport(mockTenantId, mockQuery);

      const callType = result.byType.find(t => t.type === 'call');
      expect(callType?.typeLabel).toBe('مكالمة');
    });

    it('should return user stats with completion rates', async () => {
      const result = await service.getActivitiesReport(mockTenantId, mockQuery);

      expect(result.byUser[0]).toHaveProperty('userId');
      expect(result.byUser[0]).toHaveProperty('userName');
      expect(result.byUser[0]).toHaveProperty('totalActivities');
      expect(result.byUser[0]).toHaveProperty('completedActivities');
      expect(result.byUser[0]).toHaveProperty('completionRate');
    });
  });

  describe('getContactsReport', () => {
    const mockQuery = { period: ReportPeriod.THIS_MONTH };

    beforeEach(() => {
      (prisma.contact.count as jest.Mock)
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(150); // with deals
      (prisma.contact.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { source: 'manual', _count: { id: 200 } },
          { source: 'website', _count: { id: 150 } },
          { source: 'import', _count: { id: 150 } },
        ]) // by source
        .mockResolvedValueOnce([
          { ownerId: 'user-1', _count: { id: 300 } },
          { ownerId: 'user-2', _count: { id: 200 } },
        ]); // by owner
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1', firstName: 'أحمد', lastName: 'محمد' },
        { id: 'user-2', firstName: 'سارة', lastName: 'أحمد' },
      ]);
    });

    it('should return contacts report with correct structure', async () => {
      const result = await service.getContactsReport(mockTenantId, mockQuery);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('bySource');
      expect(result).toHaveProperty('byOwner');
    });

    it('should calculate correct summary values', async () => {
      const result = await service.getContactsReport(mockTenantId, mockQuery);

      expect(result.summary.totalContacts).toBe(500);
      expect(result.summary.contactsWithDeals).toBe(150);
    });

    it('should calculate engagement rate correctly', async () => {
      const result = await service.getContactsReport(mockTenantId, mockQuery);

      // (150 / 500) * 100 = 30%
      expect(result.summary.engagementRate).toBe(30);
    });

    it('should return contacts grouped by source with Arabic labels', async () => {
      const result = await service.getContactsReport(mockTenantId, mockQuery);

      const manualSource = result.bySource.find(s => s.source === 'manual');
      expect(manualSource?.sourceLabel).toBe('يدوي');
    });
  });

  describe('Date Range Calculation', () => {
    it('should calculate correct date range for TODAY', async () => {
      (prisma.deal.count as jest.Mock).mockResolvedValue(0);
      (prisma.deal.aggregate as jest.Mock).mockResolvedValue({ _count: { id: 0 }, _sum: { value: 0 } });
      (prisma.deal.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesReport(mockTenantId, {
        period: ReportPeriod.TODAY,
      });

      const today = new Date();
      expect(result.period.startDate.getDate()).toBe(today.getDate());
      expect(result.period.endDate.getDate()).toBe(today.getDate());
    });

    it('should calculate correct date range for CUSTOM', async () => {
      (prisma.deal.count as jest.Mock).mockResolvedValue(0);
      (prisma.deal.aggregate as jest.Mock).mockResolvedValue({ _count: { id: 0 }, _sum: { value: 0 } });
      (prisma.deal.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = await service.getSalesReport(mockTenantId, {
        period: ReportPeriod.CUSTOM,
        startDate,
        endDate,
      });

      expect(result.period.startDate).toEqual(new Date(startDate));
      expect(result.period.endDate).toEqual(new Date(endDate));
    });
  });

  describe('Export Functions', () => {
    describe('exportDeals', () => {
      it('should return CSV string with headers', async () => {
        (prisma.deal.findMany as jest.Mock).mockResolvedValue([
          {
            title: 'صفقة اختبار',
            value: 1000000,
            currency: 'SAR',
            status: 'won',
            stage: { name: 'مكسوبة' },
            pipeline: { name: 'المسار الرئيسي' },
            owner: { firstName: 'أحمد', lastName: 'محمد' },
            contact: { firstName: 'خالد', lastName: 'العمري' },
            createdAt: new Date('2024-01-15'),
            closedAt: new Date('2024-01-20'),
          },
        ]);

        const result = await service.exportDeals(mockTenantId, {
          period: ReportPeriod.THIS_MONTH,
        });

        expect(result).toContain('العنوان');
        expect(result).toContain('القيمة');
        expect(result).toContain('صفقة اختبار');
        expect(result).toContain('1000000');
      });
    });

    describe('exportLeads', () => {
      it('should return CSV string with leads data', async () => {
        (prisma.lead.findMany as jest.Mock).mockResolvedValue([
          {
            firstName: 'محمد',
            lastName: 'أحمد',
            phone: '+966501234567',
            email: 'test@example.com',
            source: 'website',
            status: 'new',
            score: 80,
            scoreGrade: 'A',
            propertyType: 'villa',
            budget: 2000000,
            owner: { firstName: 'أحمد', lastName: 'محمد' },
            createdAt: new Date('2024-01-15'),
          },
        ]);

        const result = await service.exportLeads(mockTenantId, {
          period: ReportPeriod.THIS_MONTH,
        });

        expect(result).toContain('الاسم');
        expect(result).toContain('محمد أحمد');
        expect(result).toContain('+966501234567');
      });
    });

    describe('exportActivities', () => {
      it('should return CSV string with activities data', async () => {
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([
          {
            type: 'call',
            subject: 'متابعة العميل',
            description: 'مكالمة متابعة للعرض',
            contact: { firstName: 'خالد', lastName: 'العمري' },
            deal: { title: 'صفقة فيلا' },
            createdBy: { firstName: 'أحمد', lastName: 'محمد' },
            dueDate: new Date('2024-01-20'),
            isCompleted: true,
            createdAt: new Date('2024-01-15'),
          },
        ]);

        const result = await service.exportActivities(mockTenantId, {
          period: ReportPeriod.THIS_MONTH,
        });

        expect(result).toContain('النوع');
        expect(result).toContain('مكالمة');
        expect(result).toContain('متابعة العميل');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero deals gracefully', async () => {
      (prisma.deal.count as jest.Mock).mockResolvedValue(0);
      (prisma.deal.aggregate as jest.Mock).mockResolvedValue({ _count: { id: 0 }, _sum: { value: null } });
      (prisma.deal.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesReport(mockTenantId, {
        period: ReportPeriod.THIS_MONTH,
      });

      expect(result.summary.totalDeals).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
      expect(result.summary.avgDealValue).toBe(0);
    });

    it('should handle zero leads gracefully', async () => {
      (prisma.lead.count as jest.Mock).mockResolvedValue(0);
      (prisma.lead.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.lead.aggregate as jest.Mock).mockResolvedValue({ _avg: { score: null } });

      const result = await service.getLeadsReport(mockTenantId, {
        period: ReportPeriod.THIS_MONTH,
      });

      expect(result.summary.totalLeads).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
    });

    it('should handle null values in aggregations', async () => {
      (prisma.deal.count as jest.Mock).mockResolvedValue(5);
      (prisma.deal.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: null },
        _sum: { value: null },
      });
      (prisma.deal.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesReport(mockTenantId, {
        period: ReportPeriod.THIS_MONTH,
      });

      expect(result.summary.wonValue).toBe(0);
      expect(result.summary.wonDeals).toBe(0);
    });
  });
});
