// src/modules/exports/exports.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface ExportOptions {
  format: 'csv' | 'json';
  fields?: string[];
  filters?: Record<string, unknown>;
}

export interface CsvExportResult {
  data: string;
  filename: string;
  contentType: string;
}

export interface JsonExportResult {
  data: unknown[];
  count: number;
  exportedAt: string;
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportContacts(tenantId: string, options: ExportOptions = { format: 'csv' }): Promise<CsvExportResult | JsonExportResult> {
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId },
      include: {
        company: {
          select: { name: true },
        },
        owner: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (options.format === 'json') {
      return {
        data: contacts,
        count: contacts.length,
        exportedAt: new Date().toISOString(),
      };
    }

    // CSV format
    const headers = [
      'الاسم الأول',
      'الاسم الأخير',
      'البريد الإلكتروني',
      'رقم الجوال',
      'واتساب',
      'الشركة',
      'المسمى الوظيفي',
      'المصدر',
      'المسؤول',
      'تاريخ الإنشاء',
    ];

    const rows = contacts.map((c) => [
      c.firstName,
      c.lastName,
      c.email || '',
      c.phone || '',
      c.whatsapp || '',
      c.company?.name || '',
      c.title || '',
      c.source || '',
      c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : '',
      new Date(c.createdAt).toLocaleDateString('ar-SA'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csv,
      filename: `contacts_${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  async exportDeals(tenantId: string, options: ExportOptions = { format: 'csv' }): Promise<CsvExportResult | JsonExportResult> {
    const deals = await this.prisma.deal.findMany({
      where: { tenantId },
      include: {
        contact: {
          select: { firstName: true, lastName: true },
        },
        company: {
          select: { name: true },
        },
        stage: {
          select: { name: true },
        },
        owner: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (options.format === 'json') {
      return {
        data: deals,
        count: deals.length,
        exportedAt: new Date().toISOString(),
      };
    }

    // CSV format
    const headers = [
      'اسم الصفقة',
      'القيمة',
      'المرحلة',
      'جهة الاتصال',
      'الشركة',
      'تاريخ الإغلاق المتوقع',
      'المسؤول',
      'تاريخ الإنشاء',
    ];

    const rows = deals.map((d) => [
      d.title,
      d.value?.toString() || '0',
      d.stage?.name || '',
      d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '',
      d.company?.name || '',
      d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString('ar-SA') : '',
      d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : '',
      new Date(d.createdAt).toLocaleDateString('ar-SA'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csv,
      filename: `deals_${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  async exportCompanies(tenantId: string, options: ExportOptions = { format: 'csv' }): Promise<CsvExportResult | JsonExportResult> {
    const companies = await this.prisma.company.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { contacts: true, deals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (options.format === 'json') {
      return {
        data: companies,
        count: companies.length,
        exportedAt: new Date().toISOString(),
      };
    }

    // CSV format
    const headers = [
      'اسم الشركة',
      'القطاع',
      'الموقع الإلكتروني',
      'الهاتف',
      'المدينة',
      'عدد جهات الاتصال',
      'عدد الصفقات',
      'تاريخ الإنشاء',
    ];

    const rows = companies.map((c) => [
      c.name,
      c.industry || '',
      c.website || '',
      c.phone || '',
      c.city || '',
      c._count.contacts.toString(),
      c._count.deals.toString(),
      new Date(c.createdAt).toLocaleDateString('ar-SA'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csv,
      filename: `companies_${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  async exportLeads(tenantId: string, options: ExportOptions = { format: 'csv' }): Promise<CsvExportResult | JsonExportResult> {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId },
      include: {
        owner: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (options.format === 'json') {
      return {
        data: leads,
        count: leads.length,
        exportedAt: new Date().toISOString(),
      };
    }

    // CSV format
    const headers = [
      'الاسم الأول',
      'الاسم الأخير',
      'البريد الإلكتروني',
      'رقم الجوال',
      'الشركة',
      'الحالة',
      'المصدر',
      'المسؤول',
      'تاريخ الإنشاء',
    ];

    const rows = leads.map((l) => [
      l.firstName,
      l.lastName || '',
      l.email || '',
      l.phone || '',
      l.location || '',
      l.status,
      l.source || '',
      l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : '',
      new Date(l.createdAt).toLocaleDateString('ar-SA'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csv,
      filename: `leads_${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
