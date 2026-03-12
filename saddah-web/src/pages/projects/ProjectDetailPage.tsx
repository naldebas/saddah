import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Edit, Trash2, Building2, MapPin, Home } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useProject, useProducts, useDeleteProject, useDeleteProduct } from '@/hooks';
import type { Product } from '@/services/products.api';
import { EditProjectModal } from './EditProjectModal';
import { CreateProductModal } from '../products/CreateProductModal';
import { ProductDetailModal } from '../products/ProductDetailModal';

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

const projectStatusLabels: Record<string, string> = {
  active: 'نشط',
  coming_soon: 'قريباً',
  sold_out: 'مباع بالكامل',
};

const projectTypeLabels: Record<string, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  mixed: 'مختلط',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'project' | 'product'; id: string } | null>(null);

  // Query hooks
  const { data: project, isLoading: isProjectLoading } = useProject(id);
  const { data: productsData, isLoading: isProductsLoading } = useProducts({ projectId: id });
  const deleteProject = useDeleteProject();
  const deleteProduct = useDeleteProduct();

  const products = productsData?.data ?? [];

  const handleDeleteProject = async () => {
    if (!id) return;
    try {
      await deleteProject.mutateAsync(id);
      navigate('/projects');
    } catch {
      // Error handled by mutation
    }
    setDeleteConfirm(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct.mutateAsync(productId);
    } catch {
      // Error handled by mutation
    }
    setDeleteConfirm(null);
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
      key: 'type',
      header: 'النوع',
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
      key: 'floor',
      header: 'الطابق',
      cell: (product: Product) => (
        <span className="text-gray-600">{product.floor ?? '-'}</span>
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
      cell: (product: Product) => (
        <Badge variant={statusColors[product.status] || 'default'}>
          {statusLabels[product.status] || product.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (product: Product) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProductId(product.id);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ type: 'product', id: product.id });
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  if (isProjectLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">المشروع غير موجود</h3>
        <Button onClick={() => navigate('/projects')}>
          العودة للمشاريع
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge variant={statusColors[project.status] || 'default'}>
              {projectStatusLabels[project.status] || project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {project.city}
              {project.district && ` - ${project.district}`}
            </span>
            <span>{projectTypeLabels[project.type] || project.type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="w-4 h-4 ml-2" />
            تعديل
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeleteConfirm({ type: 'project', id: project.id })}
          >
            <Trash2 className="w-4 h-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الوحدات</p>
              <p className="text-2xl font-bold text-gray-900">{project.productStats?.total || 0}</p>
            </div>
            <Home className="w-8 h-8 text-primary-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">متاحة</p>
              <p className="text-2xl font-bold text-green-600">{project.productStats?.available || 0}</p>
            </div>
            <Badge variant="success">متاحة</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">محجوزة</p>
              <p className="text-2xl font-bold text-yellow-600">{project.productStats?.reserved || 0}</p>
            </div>
            <Badge variant="warning">محجوزة</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مباعة</p>
              <p className="text-2xl font-bold text-red-600">{project.productStats?.sold || 0}</p>
            </div>
            <Badge variant="error">مباعة</Badge>
          </div>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">وصف المشروع</h3>
          <p className="text-gray-600">{project.description}</p>
        </Card>
      )}

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">الوحدات</h3>
          <Button onClick={() => setIsCreateProductOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة وحدة
          </Button>
        </div>

        {isProductsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد وحدات</h3>
            <p className="text-gray-600 mb-4">ابدأ بإضافة وحدات لهذا المشروع</p>
            <Button onClick={() => setIsCreateProductOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة وحدة
            </Button>
          </div>
        ) : (
          <DataTable
            data={products}
            columns={columns}
            onRowClick={(product) => setSelectedProductId(product.id)}
          />
        )}
      </Card>

      {/* Modals */}
      {project && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
        />
      )}

      {id && (
        <CreateProductModal
          isOpen={isCreateProductOpen}
          onClose={() => setIsCreateProductOpen(false)}
          projectId={id}
        />
      )}

      {selectedProductId && (
        <ProductDetailModal
          isOpen={!!selectedProductId}
          onClose={() => setSelectedProductId(null)}
          productId={selectedProductId}
        />
      )}

      {/* Delete Confirmations */}
      <ConfirmModal
        isOpen={deleteConfirm?.type === 'project'}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteProject}
        title="حذف المشروع"
        message="هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الوحدات المرتبطة به."
        confirmText="حذف"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteConfirm?.type === 'product'}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteProduct(deleteConfirm.id)}
        title="حذف الوحدة"
        message="هل أنت متأكد من حذف هذه الوحدة؟"
        confirmText="حذف"
        variant="danger"
      />
    </div>
  );
}

export default ProjectDetailPage;
