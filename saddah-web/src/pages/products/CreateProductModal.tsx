import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCreateProduct } from '@/hooks';
import type { CreateProductDto, ProductType, ProductStatus } from '@/services/products.api';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateProductModal({ isOpen, onClose, projectId }: CreateProductModalProps) {
  const createProduct = useCreateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductDto>({
    defaultValues: {
      projectId,
      type: 'apartment' as ProductType,
      status: 'available' as ProductStatus,
      currency: 'SAR',
    },
  });

  const onSubmit = async (data: CreateProductDto) => {
    try {
      await createProduct.mutateAsync({
        ...data,
        projectId,
      });
      reset();
      onClose();
    } catch {
      // Error handled by the mutation
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة وحدة جديدة"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="رقم الوحدة"
            placeholder="مثال: A101"
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
            placeholder="150"
            {...register('area', {
              required: 'المساحة مطلوبة',
              valueAsNumber: true,
              min: { value: 0, message: 'المساحة يجب أن تكون أكبر من 0' }
            })}
            error={errors.area?.message}
          />
          <Input
            label="السعر"
            type="number"
            placeholder="800000"
            {...register('price', {
              required: 'السعر مطلوب',
              valueAsNumber: true,
              min: { value: 0, message: 'السعر يجب أن يكون أكبر من 0' }
            })}
            error={errors.price?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="عدد الغرف"
            type="number"
            placeholder="3"
            {...register('bedrooms', { valueAsNumber: true })}
          />
          <Input
            label="عدد الحمامات"
            type="number"
            placeholder="2"
            {...register('bathrooms', { valueAsNumber: true })}
          />
          <Input
            label="الطابق"
            type="number"
            placeholder="1"
            {...register('floor', { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="الحالة"
            {...register('status')}
          >
            <option value="available">متاحة</option>
            <option value="reserved">محجوزة</option>
            <option value="sold">مباعة</option>
          </Select>
          <Select
            label="العملة"
            {...register('currency')}
          >
            <option value="SAR">ريال سعودي</option>
            <option value="USD">دولار أمريكي</option>
            <option value="AED">درهم إماراتي</option>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            إضافة الوحدة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
