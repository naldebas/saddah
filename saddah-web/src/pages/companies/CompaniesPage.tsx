import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  Briefcase,
} from 'lucide-react';
import { Button, Card, DataTable, Badge, type Column } from '@/components/ui';
import { companiesApi, type Company, type CompaniesParams } from '@/services/companies.api';
import { CreateCompanyModal } from './CreateCompanyModal';
import { useAuthStore } from '@/stores/authStore';

const sizeLabels: Record<string, string> = {
  small: 'صغيرة',
  medium: 'متوسطة',
  large: 'كبيرة',
  enterprise: 'عملاقة',
};

export function CompaniesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreateCompany = user?.role !== 'sales_rep'; // Admin and sales_manager can create companies

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: CompaniesParams = {
        page: currentPage,
        limit: 20,
        sortBy: sortColumn,
        sortOrder: sortDirection,
      };
      if (searchValue) {
        params.search = searchValue;
      }

      const response = await companiesApi.getAll(params);
      setCompanies(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('فشل في تحميل الشركات');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchValue, sortColumn, sortDirection]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleRowClick = (company: Company) => {
    navigate(`/companies/${company.id}`);
  };

  const handleCompanyCreated = () => {
    setIsCreateModalOpen(false);
    fetchCompanies();
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'اسم الشركة',
      sortable: true,
      cell: (company) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{company.name}</p>
            {company.industry && (
              <p className="text-sm text-gray-500">{company.industry}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'معلومات التواصل',
      cell: (company) => (
        <div className="space-y-1">
          {company.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5" />
              <span className="ltr-nums">{company.phone}</span>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{company.website}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'الموقع',
      cell: (company) =>
        company.city ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{company.city}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'size',
      header: 'الحجم',
      cell: (company) =>
        company.size ? (
          <Badge variant="default">{sizeLabels[company.size] || company.size}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'contacts',
      header: 'جهات الاتصال',
      cell: (company) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{company._count?.contacts || 0}</span>
        </div>
      ),
    },
    {
      key: 'deals',
      header: 'الصفقات',
      cell: (company) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{company._count?.deals || 0}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإضافة',
      sortable: true,
      cell: (company) => (
        <span className="text-gray-600 ltr-nums">
          {new Date(company.createdAt).toLocaleDateString('ar-SA')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الشركات</h1>
          <p className="text-gray-600 mt-1">
            إدارة الشركات والمؤسسات
          </p>
        </div>
        {canCreateCompany && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة شركة
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <DataTable
          data={companies}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="لا توجد شركات"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={20}
          onPageChange={setCurrentPage}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchValue={searchValue}
          onSearchChange={handleSearch}
          searchPlaceholder="بحث بالاسم أو القطاع..."
          onRowClick={handleRowClick}
        />
      </Card>

      {/* Create Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCompanyCreated}
      />
    </div>
  );
}
