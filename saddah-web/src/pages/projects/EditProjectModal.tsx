import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useUpdateProject } from '@/hooks';
import type { Project, UpdateProjectDto, ProjectType, ProjectStatus } from '@/services/projects.api';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const updateProject = useUpdateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectDto>({
    defaultValues: {
      name: project.name,
      city: project.city,
      district: project.district || '',
      type: project.type as ProjectType,
      status: project.status as ProjectStatus,
      totalUnits: project.totalUnits,
      description: project.description || '',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        city: project.city,
        district: project.district || '',
        type: project.type as ProjectType,
        status: project.status as ProjectStatus,
        totalUnits: project.totalUnits,
        description: project.description || '',
      });
    }
  }, [project, reset]);

  const onSubmit = async (data: UpdateProjectDto) => {
    try {
      await updateProject.mutateAsync({ id: project.id, data });
      onClose();
    } catch {
      // Error handled by the mutation
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل المشروع"
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
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </Modal>
  );
}
