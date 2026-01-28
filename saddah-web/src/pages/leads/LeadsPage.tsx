import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Phone, MapPin, TrendingUp } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { leadsApi, Lead, LeadStatistics } from '@/services/leads.api';
import { CreateLeadModal } from './CreateLeadModal';
import { LeadDetailModal } from './LeadDetailModal';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  new: 'primary',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'error',
  converted: 'success',
  lost: 'error',
};

const statusLabels: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  unqualified: 'غير مؤهل',
  converted: 'تم التحويل',
  lost: 'مفقود',
};

const sourceLabels: Record<string, string> = {
  manual: 'يدوي',
  whatsapp_bot: 'واتساب بوت',
  voice_bot: 'بوت صوتي',
  web_form: 'نموذج ويب',
  referral: 'إحالة',
  linkedin: 'لينكدإن',
  facebook: 'فيسبوك',
  google_ads: 'إعلانات جوجل',
};

const propertyLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  land: 'أرض',
  commercial: 'تجاري',
  office: 'مكتب',
  warehouse: 'مستودع',
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statistics, setStatistics] = useState<LeadStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await leadsApi.getAll({
        page: currentPage,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        propertyType: propertyTypeFilter || undefined,
        sortBy,
        sortOrder,
      });
      setLeads(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('فشل في تحميل العملاء المحتملين');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, statusFilter, sourceFilter, propertyTypeFilter, sortBy, sortOrder]);

  const fetchStatistics = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const stats = await leadsApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('فشل في تحميل الإحصائيات');
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchLeads();
    fetchStatistics();
    toast.success('تم إضافة العميل المحتمل بنجاح');
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDetailModalOpen(true);
  };

  const handleLeadUpdated = () => {
    fetchLeads();
    fetchStatistics();
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'الاسم',
      sortable: true,
      cell: (lead: Lead) => (
        <div>
          <p className="font-medium text-gray-900">
            {lead.firstName} {lead.lastName}
          </p>
          {lead.phone && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{lead.phone}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'المصدر',
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600">
          {sourceLabels[lead.source] || lead.source}
        </span>
      ),
    },
    {
      key: 'propertyType',
      header: 'نوع العقار',
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600">
          {lead.propertyType ? propertyLabels[lead.propertyType] || lead.propertyType : '-'}
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'الميزانية',
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600" dir="ltr">
          {lead.budget ? `${lead.budget.toLocaleString()} ر.س` : '-'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'الموقع',
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          {lead.location && <MapPin className="w-3 h-3" />}
          {lead.location || '-'}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'التقييم',
      sortable: true,
      cell: (lead: Lead) => (
        <div className="flex items-center gap-2">
          {lead.score !== undefined && lead.score !== null ? (
            <>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    lead.score >= 80 ? 'bg-green-500' :
                    lead.score >= 60 ? 'bg-yellow-500' :
                    lead.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${lead.score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{lead.score}</span>
              {lead.scoreGrade && (
                <Badge variant={lead.scoreGrade === 'A' ? 'success' : lead.scoreGrade === 'B' ? 'warning' : 'default'}>
                  {lead.scoreGrade}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      sortable: true,
      cell: (lead: Lead) => (
        <Badge variant={statusColors[lead.status] || 'default'}>
          {statusLabels[lead.status] || lead.status}
        </Badge>
      ),
    },
    {
      key: 'owner',
      header: 'المسؤول',
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600">
          {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العملاء المحتملين</h1>
          <p className="text-gray-600 mt-1">إدارة ومتابعة العملاء المحتملين</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة عميل محتمل
        </Button>
      </div>

      {/* Statistics Cards */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي العملاء</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">جدد</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.byStatus.new}</p>
              </div>
              <Badge variant="primary">جديد</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مؤهلين</p>
                <p className="text-2xl font-bold text-green-600">{statistics.byStatus.qualified}</p>
              </div>
              <Badge variant="success">مؤهل</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">معدل التحويل</p>
                <p className="text-2xl font-bold text-primary-600">{statistics.conversionRate}%</p>
              </div>
              <div className="text-sm text-gray-500">
                متوسط التقييم: {statistics.averageScore}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الحالات</option>
            <option value="new">جديد</option>
            <option value="contacted">تم التواصل</option>
            <option value="qualified">مؤهل</option>
            <option value="unqualified">غير مؤهل</option>
            <option value="converted">تم التحويل</option>
            <option value="lost">مفقود</option>
          </Select>
          <Select
            label="المصدر"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع المصادر</option>
            <option value="manual">يدوي</option>
            <option value="whatsapp_bot">واتساب بوت</option>
            <option value="voice_bot">بوت صوتي</option>
            <option value="web_form">نموذج ويب</option>
            <option value="referral">إحالة</option>
            <option value="facebook">فيسبوك</option>
            <option value="google_ads">إعلانات جوجل</option>
          </Select>
          <Select
            label="نوع العقار"
            value={propertyTypeFilter}
            onChange={(e) => {
              setPropertyTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الأنواع</option>
            <option value="villa">فيلا</option>
            <option value="apartment">شقة</option>
            <option value="land">أرض</option>
            <option value="commercial">تجاري</option>
            <option value="office">مكتب</option>
            <option value="warehouse">مستودع</option>
          </Select>
        </div>
      </Card>

      {/* Leads Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          data={leads}
          columns={columns}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onSort={handleSort}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSearchChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
          searchPlaceholder="بحث عن عميل محتمل..."
          emptyMessage="لا يوجد عملاء محتملين"
          onRowClick={handleRowClick}
        />
      )}

      {/* Create Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Detail Modal */}
      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLeadId(null);
        }}
        leadId={selectedLeadId}
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  );
}

export default LeadsPage;
