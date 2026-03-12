import { useState, useMemo } from 'react';
import { Home, MapPin, DollarSign } from 'lucide-react';
import { Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useProducts, useProductStatistics, useProjects, useProjectCities } from '@/hooks';
import type { Product, ProductType, ProductStatus } from '@/services/products.api';
import { ProductDetailModal } from './ProductDetailModal';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'error',
};

const statusLabels: Record<string, string> = {
  available: 'متاحة',
  reserved: 'محجوزة',
  sold: 'مباعة',
};

const typeLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  townhouse: 'تاون هاوس',
  floor: 'دور',
  land: 'أرض',
  office: 'مكتب',
  shop: 'محل',
};

export function ProductsPage() {
  // Filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Build query params
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: search || undefined,
    projectId: projectFilter || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    city: cityFilter || undefined,
    sortBy,
    sortOrder,
  }), [currentPage, search, projectFilter, typeFilter, statusFilter, cityFilter, sortBy, sortOrder]);

  // React Query hooks
  const { data: productsData, isLoading } = useProducts(queryParams);
  const { data: statistics, isLoading: isStatsLoading } = useProductStatistics();
  const { data: projectsData } = useProjects({ limit: 100 });
  const { data: cities } = useProjectCities();

  // Extract data
  const products = productsData?.data ?? [];
  const totalPages = productsData?.meta.totalPages ?? 1;
  const totalItems = productsData?.meta.total ?? 0;
  const projects = projectsData?.data ?? [];

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleRowClick = (product: Product) => {
    setSelectedProductId(product.id);
  };

  const columns: Column<Product>[] = [
    {
      key: 'unitNumber',
      header: 'رقم الوحدة',
      sortable: true,
      cell: (product: Product) => (
        <span className="font-medium text-gray-900">{product.unitNumber}</span>
      ),
    },
    {
      key: 'project',
      header: 'المشروع',
      cell: (product: Product) => (
        <div>
          <p className="font-medium text-gray-900">{product.project?.name || '-'}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {product.project?.city}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      sortable: true,
      cell: (product: Product) => (
        <span className="text-gray-600">{typeLabels[product.type] || product.type}</span>
      ),
    },
    {
      key: 'area',
      header: 'المساحة',
      sortable: true,
      cell: (product: Product) => (
        <span className="text-gray-600" dir="ltr">{product.area} م²</span>
      ),
    },
    {
      key: 'bedrooms',
      header: 'الغرف',
      cell: (product: Product) => (
        <span className="text-gray-600">{product.bedrooms ?? '-'}</span>
      ),
    },
    {
      key: 'price',
      header: 'السعر',
      sortable: true,
      cell: (product: Product) => (
        <span className="font-medium text-gray-900" dir="ltr">
          {Number(product.price).toLocaleString()} {product.currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      sortable: true,
      cell: (product: Product) => (
        <Badge variant={statusColors[product.status] || 'default'}>
          {statusLabels[product.status] || product.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الوحدات العقارية</h1>
          <p className="text-gray-600 mt-1">جميع الوحدات في المشاريع</p>
        </div>
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
                <p className="text-sm text-gray-600">إجمالي الوحدات</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Home className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">متاحة</p>
                <p className="text-2xl font-bold text-green-600">{statistics.byStatus.available}</p>
              </div>
              <Badge variant="success">متاحة</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">محجوزة</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.byStatus.reserved}</p>
              </div>
              <Badge variant="warning">محجوزة</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">متوسط السعر</p>
                <p className="text-xl font-bold text-gray-900" dir="ltr">
                  {statistics.averagePrice.toLocaleString()} SAR
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-gray-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select
            label="المشروع"
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع المشاريع</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
          <Select
            label="المدينة"
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع المدن</option>
            {cities?.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </Select>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ProductType | '');
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الأنواع</option>
            <option value="apartment">شقة</option>
            <option value="villa">فيلا</option>
            <option value="townhouse">تاون هاوس</option>
            <option value="floor">دور</option>
            <option value="land">أرض</option>
            <option value="office">مكتب</option>
            <option value="shop">محل</option>
          </Select>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProductStatus | '');
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الحالات</option>
            <option value="available">متاحة</option>
            <option value="reserved">محجوزة</option>
            <option value="sold">مباعة</option>
          </Select>
        </div>
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          data={products}
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
          searchPlaceholder="ابحث برقم الوحدة..."
          emptyMessage="لا توجد وحدات"
          onRowClick={handleRowClick}
        />
      )}

      {/* Detail Modal */}
      {selectedProductId && (
        <ProductDetailModal
          isOpen={!!selectedProductId}
          onClose={() => setSelectedProductId(null)}
          productId={selectedProductId}
        />
      )}
    </div>
  );
}

export default ProductsPage;
