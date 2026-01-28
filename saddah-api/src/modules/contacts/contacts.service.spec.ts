import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockContact = {
    id: 'contact-123',
    tenantId: mockTenantId,
    ownerId: mockUserId,
    firstName: 'أحمد',
    lastName: 'محمد',
    email: 'ahmed@example.com',
    phone: '+966501234567',
    whatsapp: '+966501234567',
    title: 'مدير',
    source: 'manual',
    tags: ['عميل_محتمل'],
    customFields: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: mockUserId,
      firstName: 'محمد',
      lastName: 'علي',
    },
    company: null,
  };

  const mockPrismaService = {
    contact: {
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
        ContactsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a contact successfully', async () => {
      const createDto = {
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'ahmed@example.com',
        phone: '+966501234567',
      };

      mockPrismaService.contact.create.mockResolvedValue(mockContact);

      const result = await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.contact.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          ownerId: mockUserId,
          companyId: undefined,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
          email: createDto.email,
          phone: createDto.phone,
          whatsapp: undefined,
          title: undefined,
          source: 'manual',
          tags: [],
          customFields: {},
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockContact);
    });

    it('should use custom ownerId when provided', async () => {
      const customOwnerId = 'custom-owner-123';
      const createDto = {
        firstName: 'أحمد',
        lastName: 'محمد',
        ownerId: customOwnerId,
      };

      mockPrismaService.contact.create.mockResolvedValue({
        ...mockContact,
        ownerId: customOwnerId,
      });

      await service.create(mockTenantId, mockUserId, createDto);

      expect(mockPrismaService.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: customOwnerId,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts', async () => {
      const contacts = [mockContact];
      mockPrismaService.contact.findMany.mockResolvedValue(contacts);
      mockPrismaService.contact.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toEqual({
        data: contacts,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { search: 'أحمد' });

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: 'أحمد', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(50);

      const result = await service.findAll(mockTenantId, { page: 2, limit: 10 });

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
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

    it('should filter by ownerId', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      await service.findAll(mockTenantId, { ownerId: 'owner-123' });

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'owner-123',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a contact by id', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);

      const result = await service.findOne(mockTenantId, 'contact-123');

      expect(mockPrismaService.contact.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'contact-123',
          tenantId: mockTenantId,
          isActive: true,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a contact successfully', async () => {
      const updateDto = {
        firstName: 'أحمد المعدل',
        email: 'new-email@example.com',
      };

      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.contact.update.mockResolvedValue({
        ...mockContact,
        ...updateDto,
      });

      const result = await service.update(mockTenantId, 'contact-123', updateDto);

      expect(mockPrismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: expect.objectContaining({
          firstName: updateDto.firstName,
          email: updateDto.email,
        }),
        include: expect.any(Object),
      });
      expect(result.firstName).toBe('أحمد المعدل');
    });

    it('should throw NotFoundException when updating nonexistent contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantId, 'nonexistent-id', { firstName: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.contact.update.mockResolvedValue({
        ...mockContact,
        isActive: false,
      });

      const result = await service.remove(mockTenantId, 'contact-123');

      expect(mockPrismaService.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: { isActive: false },
      });
      expect(result).toEqual({ message: 'تم حذف جهة الاتصال بنجاح' });
    });

    it('should throw NotFoundException when removing nonexistent contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
