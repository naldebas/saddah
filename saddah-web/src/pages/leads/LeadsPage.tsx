import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Phone, MapPin, TrendingUp } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useLeads, useLeadStatistics } from '@/hooks';
import type { Lead } from '@/services/leads.api';
import { CreateLeadModal } from './CreateLeadModal';
import { LeadDetailModal } from './LeadDetailModal';
import { useAuthStore } from '@/stores/authStore';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  new: 'primary',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'error',
  converted: 'success',
  lost: 'error',
};

export function LeadsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const canCreateLead = user?.role !== 'sales_rep'; // Only admin and sales_manager can create leads

  // Filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Build query params - memoized to prevent unnecessary re-renders
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    propertyType: propertyTypeFilter || undefined,
    sortBy,
    sortOrder,
  }), [currentPage, search, statusFilter, sourceFilter, propertyTypeFilter, sortBy, sortOrder]);

  // React Query hooks - automatic caching, loading states, and refetching
  const {
    data: leadsData,
    isLoading,
  } = useLeads(queryParams);

  const {
    data: statistics,
    isLoading: isStatsLoading
  } = useLeadStatistics();

  // Extract data from response
  const leads = leadsData?.data ?? [];
  const totalPages = leadsData?.meta.totalPages ?? 1;
  const totalItems = leadsData?.meta.total ?? 0;

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    // No need to manually refetch - React Query handles cache invalidation
    toast.success(t('leads.created'));
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDetailModalOpen(true);
  };

  const handleLeadUpdated = () => {
    // React Query automatically refetches when mutations invalidate the cache
    // This callback can be used for additional UI updates if needed
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: t('common.name'),
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
      header: t('leads.source'),
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600">
          {t(`leads.sources.${lead.source}`, { defaultValue: lead.source })}
        </span>
      ),
    },
    {
      key: 'propertyType',
      header: t('leads.propertyType'),
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600">
          {lead.propertyType ? t(`leads.propertyTypes.${lead.propertyType}`, { defaultValue: lead.propertyType }) : '-'}
        </span>
      ),
    },
    {
      key: 'budget',
      header: t('leads.budget'),
      sortable: true,
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600" dir="ltr">
          {lead.budget ? `${lead.budget.toLocaleString()} ${t('common.currency')}` : '-'}
        </span>
      ),
    },
    {
      key: 'location',
      header: t('leads.location'),
      cell: (lead: Lead) => (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          {lead.location && <MapPin className="w-3 h-3" />}
          {lead.location || '-'}
        </span>
      ),
    },
    {
      key: 'score',
      header: t('leads.score'),
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
      header: t('leads.status'),
      sortable: true,
      cell: (lead: Lead) => (
        <Badge variant={statusColors[lead.status] || 'default'}>
          {t(`leads.statuses.${lead.status}`, { defaultValue: lead.status })}
        </Badge>
      ),
    },
    {
      key: 'owner',
      header: t('leads.owner'),
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
          <h1 className="text-2xl font-bold text-gray-900">{t('leads.title')}</h1>
          <p className="text-gray-600 mt-1">{t('leads.subtitle')}</p>
        </div>
        {canCreateLead && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            {t('leads.addNew')}
          </Button>
        )}
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
                <p className="text-sm text-gray-600">{t('leads.totalLeads')}</p>
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
                <p className="text-sm text-gray-600">{t('leads.newLeads')}</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.byStatus.new}</p>
              </div>
              <Badge variant="primary">{t('leads.statuses.new')}</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('leads.qualifiedLeads')}</p>
                <p className="text-2xl font-bold text-green-600">{statistics.byStatus.qualified}</p>
              </div>
              <Badge variant="success">{t('leads.statuses.qualified')}</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('dashboard.conversionRate')}</p>
                <p className="text-2xl font-bold text-primary-600">{statistics.conversionRate}%</p>
              </div>
              <div className="text-sm text-gray-500">
                {t('leads.avgScore')}: {statistics.averageScore}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label={t('leads.status')}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{t('leads.allStatuses')}</option>
            <option value="new">{t('leads.statuses.new')}</option>
            <option value="contacted">{t('leads.statuses.contacted')}</option>
            <option value="qualified">{t('leads.statuses.qualified')}</option>
            <option value="unqualified">{t('leads.statuses.unqualified')}</option>
            <option value="converted">{t('leads.statuses.converted')}</option>
            <option value="lost">{t('leads.statuses.lost')}</option>
          </Select>
          <Select
            label={t('leads.source')}
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{t('leads.allSources')}</option>
            <option value="manual">{t('leads.sources.manual')}</option>
            <option value="whatsapp_bot">{t('leads.sources.whatsapp_bot')}</option>
            <option value="voice_bot">{t('leads.sources.voice_bot')}</option>
            <option value="web_form">{t('leads.sources.web_form')}</option>
            <option value="referral">{t('leads.sources.referral')}</option>
            <option value="facebook">{t('leads.sources.facebook')}</option>
            <option value="google_ads">{t('leads.sources.google_ads')}</option>
          </Select>
          <Select
            label={t('leads.propertyType')}
            value={propertyTypeFilter}
            onChange={(e) => {
              setPropertyTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{t('leads.allPropertyTypes')}</option>
            <option value="villa">{t('leads.propertyTypes.villa')}</option>
            <option value="apartment">{t('leads.propertyTypes.apartment')}</option>
            <option value="land">{t('leads.propertyTypes.land')}</option>
            <option value="commercial">{t('leads.propertyTypes.commercial')}</option>
            <option value="office">{t('leads.propertyTypes.office')}</option>
            <option value="warehouse">{t('leads.propertyTypes.warehouse')}</option>
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
          searchPlaceholder={t('leads.searchPlaceholder')}
          emptyMessage={t('leads.noLeads')}
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
