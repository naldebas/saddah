import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCreateProject } from '@/hooks';
import type { CreateProjectDto, ProjectType, ProjectStatus } from '@/services/projects.api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectDto>({
    defaultValues: {
      type: 'residential' as ProjectType,
      status: 'active' as ProjectStatus,
      totalUnits: 0,
    },
  });

  const onSubmit = async (data: CreateProjectDto) => {
    try {
      await createProject.mutateAsync(data);
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
      title="إضافة مشروع جديد"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="اسم المشروع"
          placeholder="مثال: برج الياسمين"
          {...register('name', { required: 'اسم المشروع مطلوب' })}
          error={errors.name?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="المدينة"
            placeholder="مثال: الرياض"
            {...register('city', { required: 'المدينة مطلوبة' })}
            error={errors.city?.message}
          />
          <Input
            label="الحي"
            placeholder="مثال: حي الياسمين"
            {...register('district')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="نوع المشروع"
            {...register('type', { required: 'نوع المشروع مطلوب' })}
            error={errors.type?.message}
          >
            <option value="residential">سكني</option>
            <option value="commercial">تجاري</option>
            <option value="mixed">مختلط</option>
          </Select>
          <Select
            label="حالة المشروع"
            {...register('status')}
          >
            <option value="active">نشط</option>
            <option value="coming_soon">قريباً</option>
            <option value="sold_out">مباع بالكامل</option>
          </Select>
        </div>

        <Input
          label="إجمالي الوحدات"
          type="number"
          placeholder="0"
          {...register('totalUnits', { valueAsNumber: true })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            وصف المشروع
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder="وصف تفصيلي للمشروع..."
            {...register('description')}
          />
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
            إنشاء المشروع
          </Button>
        </div>
      </form>
    </Modal>
  );
}
