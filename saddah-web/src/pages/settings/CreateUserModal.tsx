import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { userApi, CreateUserDto } from '@/services/user.api';

interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

const createUserSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'الاسم الأخير مطلوب'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales_manager', 'sales_rep']),
  language: z.enum(['ar', 'en']).optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'sales_rep',
      language: 'ar',
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    setLoading(true);
    try {
      await userApi.create(data as CreateUserDto);
      toast.success('تم إضافة المستخدم بنجاح');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create user:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || 'فشل في إضافة المستخدم');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">إضافة عضو جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الاسم الأول"
              placeholder="أدخل الاسم الأول"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="الاسم الأخير"
              placeholder="أدخل الاسم الأخير"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="example@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="كلمة المرور"
            type="password"
            placeholder="أدخل كلمة المرور"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="رقم الجوال"
            type="tel"
            placeholder="+966500000000"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الدور الوظيفي
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              {...register('role')}
            >
              <option value="admin">مدير النظام</option>
              <option value="sales_manager">مدير المبيعات</option>
              <option value="sales_rep">مندوب مبيعات</option>
            </select>
            {errors.role && (
              <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اللغة
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              {...register('language')}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 me-2" />
                  إضافة العضو
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
