import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';

interface MatchResult {
  productId: string;
  score: number;
  reasons: Record<string, number>;
}

interface ProductWithProject {
  id: string;
  tenantId: string;
  projectId: string;
  unitNumber: string;
  type: string;
  area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  price: number;
  currency: string;
  status: string;
  features: string[];
  images: unknown;
  project: {
    id: string;
    name: string;
    city: string;
    district: string | null;
    type: string;
  };
}

@Injectable()
export class ProductSuggestionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find matching products based on lead criteria
   */
  async findMatchingProducts(
    tenantId: string,
    criteria: SearchProductsDto,
  ): Promise<MatchResult[]> {
    // Fetch available products
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        status: 'available',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            type: true,
          },
        },
      },
    });

    // Calculate match scores for each product
    const matches: MatchResult[] = [];

    for (const product of products) {
      const { score, reasons } = this.calculateMatchScore(product as unknown as ProductWithProject, criteria);

      if (score > 0) {
        matches.push({
          productId: product.id,
          score,
          reasons,
        });
      }
    }

    // Sort by score descending and limit results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, criteria.limit || 10);
  }

  /**
   * Calculate match score between a product and criteria
   * Maximum score: 100
   */
  calculateMatchScore(
    product: ProductWithProject,
    criteria: SearchProductsDto,
  ): { score: number; reasons: Record<string, number> } {
    const reasons: Record<string, number> = {};
    let totalScore = 0;

    // Property type match (30 points)
    if (criteria.propertyType) {
      const normalizedCriteria = this.normalizePropertyType(criteria.propertyType);
      if (product.type === normalizedCriteria) {
        reasons.propertyType = 30;
        totalScore += 30;
      }
    }

    // City match (25 points)
    if (criteria.city) {
      const cityMatch = this.normalizeCityName(product.project.city) ===
                       this.normalizeCityName(criteria.city);
      if (cityMatch) {
        reasons.city = 25;
        totalScore += 25;
      }
    }

    // District match (10 points) - bonus if same city
    if (criteria.district && product.project.district) {
      const districtMatch = this.normalizeDistrictName(product.project.district) ===
                           this.normalizeDistrictName(criteria.district);
      if (districtMatch) {
        reasons.district = 10;
        totalScore += 10;
      }
    }

    // Budget match (25 points)
    if (criteria.budgetMax) {
      const productPrice = Number(product.price);
      if (productPrice <= criteria.budgetMax) {
        // Full points if within budget
        reasons.budget = 25;
        totalScore += 25;
      } else if (productPrice <= criteria.budgetMax * 1.1) {
        // Partial points if within 10% over budget
        reasons.budget = 15;
        totalScore += 15;
      }
    }

    // Bedrooms match (10 points)
    if (criteria.minBedrooms !== undefined && product.bedrooms !== null) {
      if (product.bedrooms >= criteria.minBedrooms) {
        reasons.bedrooms = 10;
        totalScore += 10;
      }
    }

    // Area match (optional, bonus points if specified)
    if (criteria.minArea !== undefined && product.area !== null) {
      const area = Number(product.area);
      if (area >= criteria.minArea) {
        reasons.area = 5;
        totalScore += 5;
      }
    }

    return { score: totalScore, reasons };
  }

  /**
   * Create product suggestions for a lead
   */
  async createSuggestions(leadId: string, matches: MatchResult[]): Promise<void> {
    if (matches.length === 0) return;

    const suggestions = matches.map((match) => ({
      leadId,
      productId: match.productId,
      matchScore: match.score,
      matchReason: match.reasons,
    }));

    // Use upsert to handle potential duplicates
    for (const suggestion of suggestions) {
      await this.prisma.leadProductSuggestion.upsert({
        where: {
          leadId_productId: {
            leadId: suggestion.leadId,
            productId: suggestion.productId,
          },
        },
        update: {
          matchScore: suggestion.matchScore,
          matchReason: suggestion.matchReason,
        },
        create: suggestion,
      });
    }
  }

  /**
   * Get suggestions for a lead
   */
  async getSuggestionsForLead(leadId: string) {
    const suggestions = await this.prisma.leadProductSuggestion.findMany({
      where: { leadId },
      include: {
        product: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });

    return suggestions;
  }

  /**
   * Update suggestion status
   */
  async updateSuggestionStatus(
    leadId: string,
    productId: string,
    status: 'viewed' | 'interested' | 'rejected',
  ) {
    return this.prisma.leadProductSuggestion.update({
      where: {
        leadId_productId: { leadId, productId },
      },
      data: { status },
    });
  }

  /**
   * Normalize property type to match product types
   */
  private normalizePropertyType(type: string): string {
    const mappings: Record<string, string> = {
      'شقة': 'apartment',
      'apartment': 'apartment',
      'فيلا': 'villa',
      'villa': 'villa',
      'أرض': 'land',
      'land': 'land',
      'تجاري': 'office',
      'commercial': 'office',
      'مكتب': 'office',
      'office': 'office',
      'تاون هاوس': 'townhouse',
      'townhouse': 'townhouse',
      'دور': 'floor',
      'floor': 'floor',
      'محل': 'shop',
      'shop': 'shop',
    };

    return mappings[type.toLowerCase()] || type.toLowerCase();
  }

  /**
   * Normalize city name for comparison
   */
  private normalizeCityName(city: string): string {
    const mappings: Record<string, string> = {
      'الرياض': 'riyadh',
      'riyadh': 'riyadh',
      'جدة': 'jeddah',
      'jeddah': 'jeddah',
      'الدمام': 'dammam',
      'dammam': 'dammam',
      'مكة': 'makkah',
      'makkah': 'makkah',
      'المدينة': 'madinah',
      'madinah': 'madinah',
    };

    const normalized = city.toLowerCase().trim();
    return mappings[normalized] || normalized;
  }

  /**
   * Normalize district name for comparison
   */
  private normalizeDistrictName(district: string): string {
    // Remove common prefixes like "حي"
    return district
      .toLowerCase()
      .trim()
      .replace(/^حي\s+/, '')
      .replace(/^district\s+/i, '');
  }
}
