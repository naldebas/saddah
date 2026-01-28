// src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface SearchResult {
  type: 'contact' | 'company' | 'deal' | 'lead';
  id: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResult {
  contacts: SearchResult[];
  companies: SearchResult[];
  deals: SearchResult[];
  leads: SearchResult[];
  total: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(tenantId: string, query: string, limit = 5): Promise<GlobalSearchResult> {
    if (!query || query.length < 2) {
      return { contacts: [], companies: [], deals: [], leads: [], total: 0 };
    }

    const searchTerm = query.toLowerCase();

    const [contacts, companies, deals, leads] = await Promise.all([
      this.searchContacts(tenantId, searchTerm, limit),
      this.searchCompanies(tenantId, searchTerm, limit),
      this.searchDeals(tenantId, searchTerm, limit),
      this.searchLeads(tenantId, searchTerm, limit),
    ]);

    return {
      contacts,
      companies,
      deals,
      leads,
      total: contacts.length + companies.length + deals.length + leads.length,
    };
  }

  private async searchContacts(tenantId: string, query: string, limit: number): Promise<SearchResult[]> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { whatsapp: { contains: query } },
        ],
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: { select: { name: true } },
      },
    });

    return contacts.map((c) => ({
      type: 'contact' as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.company?.name || c.email || c.phone || undefined,
      metadata: { email: c.email, phone: c.phone },
    }));
  }

  private async searchCompanies(tenantId: string, query: string, limit: number): Promise<SearchResult[]> {
    const companies = await this.prisma.company.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        industry: true,
        city: true,
        _count: { select: { contacts: true } },
      },
    });

    return companies.map((c) => ({
      type: 'company' as const,
      id: c.id,
      title: c.name,
      subtitle: c.industry || c.city || undefined,
      metadata: { contactsCount: c._count.contacts },
    }));
  }

  private async searchDeals(tenantId: string, query: string, limit: number): Promise<SearchResult[]> {
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        title: true,
        value: true,
        status: true,
        stage: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    return deals.map((d) => ({
      type: 'deal' as const,
      id: d.id,
      title: d.title,
      subtitle: d.stage?.name || d.status,
      metadata: {
        value: Number(d.value),
        status: d.status,
        contactName: d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : null,
      },
    }));
  }

  private async searchLeads(tenantId: string, query: string, limit: number): Promise<SearchResult[]> {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        source: true,
      },
    });

    return leads.map((l) => ({
      type: 'lead' as const,
      id: l.id,
      title: `${l.firstName} ${l.lastName || ''}`.trim(),
      subtitle: l.source || l.status,
      metadata: { email: l.email, phone: l.phone, status: l.status },
    }));
  }

  async searchByType(
    tenantId: string,
    type: 'contacts' | 'companies' | 'deals' | 'leads',
    query: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    switch (type) {
      case 'contacts':
        return this.searchContactsPaginated(tenantId, query, skip, limit);
      case 'companies':
        return this.searchCompaniesPaginated(tenantId, query, skip, limit);
      case 'deals':
        return this.searchDealsPaginated(tenantId, query, skip, limit);
      case 'leads':
        return this.searchLeadsPaginated(tenantId, query, skip, limit);
    }
  }

  private async searchContactsPaginated(tenantId: string, query: string, skip: number, limit: number) {
    const where = {
      tenantId,
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { phone: { contains: query } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, meta: { total, page: Math.floor(skip / limit) + 1, limit, totalPages: Math.ceil(total / limit) } };
  }

  private async searchCompaniesPaginated(tenantId: string, query: string, skip: number, limit: number) {
    const where = {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { industry: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { contacts: true, deals: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, meta: { total, page: Math.floor(skip / limit) + 1, limit, totalPages: Math.ceil(total / limit) } };
  }

  private async searchDealsPaginated(tenantId: string, query: string, skip: number, limit: number) {
    const where = {
      tenantId,
      title: { contains: query, mode: 'insensitive' as const },
    };

    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        include: {
          stage: { select: { id: true, name: true, color: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data, meta: { total, page: Math.floor(skip / limit) + 1, limit, totalPages: Math.ceil(total / limit) } };
  }

  private async searchLeadsPaginated(tenantId: string, query: string, skip: number, limit: number) {
    const where = {
      tenantId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { phone: { contains: query } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, meta: { total, page: Math.floor(skip / limit) + 1, limit, totalPages: Math.ceil(total / limit) } };
  }
}
