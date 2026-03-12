import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button, Spinner } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useProduct, useUpdateProduct, useUpdateProductStatus } from '@/hooks';
import type { UpdateProductDto, ProductType, ProductStatus } from '@/services/products.api';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

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

export function ProductDetailModal({ isOpen, onClose, productId }: ProductDetailModalProps) {
  const { data: product, isLoading } = useProduct(productId);
  const updateProduct = useUpdateProduct();
  const updateStatus = useUpdateProductStatus();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProductDto>();

  useEffect(() => {
    if (product) {
      reset({
        unitNumber: product.unitNumber,
        type: product.type as ProductType,
        area: Number(product.area),
        bedrooms: product.bedrooms ?? undefined,
        bathrooms: product.bathrooms ?? undefined,
        floor: product.floor ?? undefined,
        price: Number(product.price),
        currency: product.currency,
        status: product.status as ProductStatus,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: UpdateProductDto) => {
    try {
      await updateProduct.mutateAsync({ id: productId, data });
      onClose();
    } catch {
      // Error handled by the mutation
    }
  };

  const handleStatusChange = async (status: ProductStatus) => {
    try {
      await updateStatus.mutateAsync({ id: productId, status });
    } catch {
      // Error handled by the mutation
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل الوحدة"
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : product ? (
        <div className="space-y-6">
          {/* Header with status */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {product.unitNumber}
              </h3>
              <p className="text-sm text-gray-600">
                {product.project?.name} - {product.project?.city}
              </p>
            </div>
            <Badge variant={statusColors[product.status] || 'default'} className="text-sm">
              {statusLabels[product.status] || product.status}
            </Badge>
          </div>

          {/* Quick Status Actions */}
          <div className="flex gap-2">
            <span className="text-sm text-gray-600 ml-2">تغيير الحالة:</span>
            {(['available', 'reserved', 'sold'] as ProductStatus[]).map((status) => (
              <Button
                key={status}
                variant={product.status === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(status)}
                disabled={product.status === status}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="رقم الوحدة"
                {...register('unitNumber', { required: 'رقم الوحدة مطلوب' })}
                error={errors.unitNumber?.message}
              />
              <Select
                label="نوع الوحدة"
                {...register('type', { required: 'نوع الوحدة مطلوب' })}
                error={errors.type?.message}
              >
                <option value="apartment">شقة</option>
                <option value="villa">فيلا</option>
                <option value="townhouse">تاون هاوس</option>
                <option value="floor">دور</option>
                <option value="land">أرض</option>
                <option value="office">مكتب</option>
                <option value="shop">محل</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="المساحة (م²)"
                type="number"
                step="0.01"
                {...register('area', {
                  required: 'المساحة مطلوبة',
                  valueAsNumber: true,
                })}
                error={errors.area?.message}
              />
              <Input
                label="السعر"
                type="number"
                {...register('price', {
                  required: 'السعر مطلوب',
                  valueAsNumber: true,
                })}
                error={errors.price?.message}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="عدد الغرف"
                type="number"
                {...register('bedrooms', { valueAsNumber: true })}
              />
              <Input
                label="عدد الحمامات"
                type="number"
                {...register('bathrooms', { valueAsNumber: true })}
              />
              <Input
                label="الطابق"
                type="number"
                {...register('floor', { valueAsNumber: true })}
              />
            </div>

            <Select
              label="العملة"
              {...register('currency')}
            >
              <option value="SAR">ريال سعودي</option>
              <option value="USD">دولار أمريكي</option>
              <option value="AED">درهم إماراتي</option>
            </Select>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                إغلاق
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!isDirty}
              >
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">الوحدة غير موجودة</p>
        </div>
      )}
    </Modal>
  );
}
