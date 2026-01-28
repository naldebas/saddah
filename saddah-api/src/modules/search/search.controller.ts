// src/modules/search/search.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'بحث شامل في جميع الكيانات' })
  @ApiQuery({ name: 'q', description: 'نص البحث', required: true })
  @ApiQuery({ name: 'limit', description: 'عدد النتائج لكل نوع', required: false })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  async globalSearch(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.globalSearch(
      tenantId,
      query,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get('contacts')
  @ApiOperation({ summary: 'بحث في جهات الاتصال' })
  @ApiQuery({ name: 'q', description: 'نص البحث', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  async searchContacts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchByType(
      tenantId,
      'contacts',
      query,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('companies')
  @ApiOperation({ summary: 'بحث في الشركات' })
  @ApiQuery({ name: 'q', description: 'نص البحث', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  async searchCompanies(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchByType(
      tenantId,
      'companies',
      query,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('deals')
  @ApiOperation({ summary: 'بحث في الصفقات' })
  @ApiQuery({ name: 'q', description: 'نص البحث', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  async searchDeals(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchByType(
      tenantId,
      'deals',
      query,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('leads')
  @ApiOperation({ summary: 'بحث في العملاء المحتملين' })
  @ApiQuery({ name: 'q', description: 'نص البحث', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  async searchLeads(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchByType(
      tenantId,
      'leads',
      query,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
