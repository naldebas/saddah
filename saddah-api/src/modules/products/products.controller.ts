import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { ProductSuggestionService } from './product-suggestion.service';
import { CreateProductDto, ProductStatus } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { RequirePermission } from '@/modules/auth/decorators/permission.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly suggestionService: ProductSuggestionService,
  ) {}

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'إنشاء وحدة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الوحدة بنجاح' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'الحصول على قائمة الوحدات' })
  @ApiResponse({ status: 200, description: 'قائمة الوحدات' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(tenantId, query);
  }

  @Get('statistics')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'الحصول على إحصائيات الوحدات' })
  @ApiResponse({ status: 200, description: 'إحصائيات الوحدات' })
  getStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getStatistics(tenantId);
  }

  @Get('search')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'البحث عن وحدات مطابقة للمعايير' })
  @ApiResponse({ status: 200, description: 'الوحدات المطابقة' })
  async search(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: SearchProductsDto,
  ) {
    const matches = await this.suggestionService.findMatchingProducts(
      tenantId,
      query,
    );

    // Get full product details for matches
    if (matches.length === 0) {
      return { data: [], total: 0 };
    }

    const productIds = matches.map((m) => m.productId);
    const products = await this.productsService.findAll(tenantId, {
      page: 1,
      limit: matches.length,
    });

    // Add match scores to products
    const productsWithScores = products.data
      .filter((p) => productIds.includes(p.id))
      .map((p) => {
        const match = matches.find((m) => m.productId === p.id);
        return {
          ...p,
          matchScore: match?.score || 0,
          matchReasons: match?.reasons || {},
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      data: productsWithScores,
      total: productsWithScores.length,
    };
  }

  @Get('suggestions/:leadId')
  @RequirePermission('leads.view')
  @ApiOperation({ summary: 'الحصول على اقتراحات الوحدات لعميل محتمل' })
  @ApiResponse({ status: 200, description: 'اقتراحات الوحدات' })
  getSuggestions(@Param('leadId', ParseUUIDPipe) leadId: string) {
    return this.suggestionService.getSuggestionsForLead(leadId);
  }

  @Patch('suggestions/:leadId/:productId/status')
  @RequirePermission('leads.edit')
  @ApiOperation({ summary: 'تحديث حالة الاقتراح' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة الاقتراح' })
  updateSuggestionStatus(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body('status') status: 'viewed' | 'interested' | 'rejected',
  ) {
    return this.suggestionService.updateSuggestionStatus(leadId, productId, status);
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'الحصول على تفاصيل وحدة' })
  @ApiResponse({ status: 200, description: 'تفاصيل الوحدة' })
  @ApiResponse({ status: 404, description: 'الوحدة غير موجودة' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'تحديث وحدة' })
  @ApiResponse({ status: 200, description: 'تم تحديث الوحدة بنجاح' })
  @ApiResponse({ status: 404, description: 'الوحدة غير موجودة' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'تغيير حالة الوحدة' })
  @ApiResponse({ status: 200, description: 'تم تغيير حالة الوحدة' })
  updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProductStatus,
  ) {
    return this.productsService.updateStatus(tenantId, id, status);
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @ApiOperation({ summary: 'حذف وحدة' })
  @ApiResponse({ status: 200, description: 'تم حذف الوحدة بنجاح' })
  @ApiResponse({ status: 404, description: 'الوحدة غير موجودة' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(tenantId, id);
  }
}
