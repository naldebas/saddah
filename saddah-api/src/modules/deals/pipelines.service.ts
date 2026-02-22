// src/modules/deals/pipelines.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePipelineDto, CreatePipelineStageDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  // Default stages for new pipeline
  private readonly defaultStages: CreatePipelineStageDto[] = [
    { name: 'جديد', order: 0, probability: 10, color: '#6B7280' },
    { name: 'التأهيل', order: 1, probability: 20, color: '#3B82F6' },
    { name: 'العرض', order: 2, probability: 40, color: '#8B5CF6' },
    { name: 'التفاوض', order: 3, probability: 60, color: '#F59E0B' },
    { name: 'الإغلاق', order: 4, probability: 80, color: '#10B981' },
  ];

  async create(tenantId: string, dto: CreatePipelineDto) {
    const stages = dto.stages?.length ? dto.stages : this.defaultStages;

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.create({
      data: {
        tenantId,
        name: dto.name,
        isDefault: dto.isDefault || false,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            order: stage.order ?? index,
            probability: stage.probability ?? 0,
            color: stage.color ?? '#6B7280',
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { deals: true },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { deals: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { deals: true },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('خط المبيعات غير موجود');
    }

    return pipeline;
  }

  async findDefault(tenantId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pipeline) {
      // Return first pipeline if no default
      const first = await this.prisma.pipeline.findFirst({
        where: { tenantId },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!first) {
        throw new NotFoundException('لا يوجد خطوط مبيعات');
      }

      return first;
    }

    return pipeline;
  }

  async update(tenantId: string, id: string, dto: UpdatePipelineDto) {
    await this.findOne(tenantId, id);

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { deals: true },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const pipeline = await this.findOne(tenantId, id);

    // Check if pipeline has deals
    if (pipeline._count.deals > 0) {
      throw new BadRequestException(
        'لا يمكن حذف خط المبيعات لأنه يحتوي على صفقات',
      );
    }

    // Cannot delete if it's the only pipeline
    const count = await this.prisma.pipeline.count({
      where: { tenantId },
    });

    if (count <= 1) {
      throw new BadRequestException(
        'لا يمكن حذف خط المبيعات الوحيد',
      );
    }

    await this.prisma.pipeline.delete({
      where: { id },
    });

    return { message: 'تم حذف خط المبيعات بنجاح' };
  }

  // Stage management
  async addStage(tenantId: string, pipelineId: string, dto: CreatePipelineStageDto) {
    await this.findOne(tenantId, pipelineId);

    // Auto-calculate order if not provided
    let order = dto.order;
    if (order === undefined) {
      const maxOrderStage = await this.prisma.pipelineStage.findFirst({
        where: { pipelineId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (maxOrderStage?.order ?? -1) + 1;
    }

    return this.prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: dto.name,
        order,
        probability: dto.probability ?? 0,
        color: dto.color ?? '#6B7280',
      },
    });
  }

  async updateStage(
    tenantId: string,
    pipelineId: string,
    stageId: string,
    dto: UpdateStageDto,
  ) {
    await this.findOne(tenantId, pipelineId);

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId },
    });

    if (!stage) {
      throw new NotFoundException('المرحلة غير موجودة');
    }

    return this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.color && { color: dto.color }),
      },
    });
  }

  async removeStage(tenantId: string, pipelineId: string, stageId: string) {
    await this.findOne(tenantId, pipelineId);

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId },
      include: {
        _count: {
          select: { deals: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('المرحلة غير موجودة');
    }

    if (stage._count.deals > 0) {
      throw new BadRequestException(
        'لا يمكن حذف المرحلة لأنها تحتوي على صفقات',
      );
    }

    // Check minimum stages
    const stageCount = await this.prisma.pipelineStage.count({
      where: { pipelineId },
    });

    if (stageCount <= 2) {
      throw new BadRequestException(
        'يجب أن يحتوي خط المبيعات على مرحلتين على الأقل',
      );
    }

    await this.prisma.pipelineStage.delete({
      where: { id: stageId },
    });

    return { message: 'تم حذف المرحلة بنجاح' };
  }

  async reorderStages(
    tenantId: string,
    pipelineId: string,
    stageOrders: { id: string; order: number }[],
  ) {
    await this.findOne(tenantId, pipelineId);

    // Update all stages in a transaction
    await this.prisma.$transaction(
      stageOrders.map(({ id, order }) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return this.findOne(tenantId, pipelineId);
  }
}
