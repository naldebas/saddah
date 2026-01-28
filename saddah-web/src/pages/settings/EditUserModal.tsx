import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserCog, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { userApi, User, UpdateUserDto } from '@/services/user.api';

interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

const updateUserSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'الاسم الأخير مطلوب'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'sales_manager', 'sales_rep']),
  language: z.enum(['ar', 'en']).optional(),
  isActive: z.boolean().optional(),
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        role: user.role as 'admin' | 'sales_manager' | 'sales_rep',
        language: (user.language || 'ar') as 'ar' | 'en',
        isActive: user.isActive ?? true,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      await userApi.update(user.id, data as UpdateUserDto);
      toast.success('تم تحديث المستخدم بنجاح');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update user:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || 'فشل في تحديث المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    setDeleting(true);
    try {
      await userApi.delete(user.id);
      toast.success('تم حذف المستخدم بنجاح');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete user:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || 'فشل في حذف المستخدم');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">تعديل المستخدم</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
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

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              المستخدم نشط
            </label>
          </div>

          {/* User stats */}
          {user._count && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">إحصائيات المستخدم</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user._count.ownedDeals}</p>
                  <p className="text-xs text-gray-500">صفقة</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user._count.activities}</p>
                  <p className="text-xs text-gray-500">نشاط</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user._count.ownedContacts || 0}</p>
                  <p className="text-xs text-gray-500">عميل</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {deleting ? (
                <span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
              ) : (
                <Trash2 className="h-4 w-4 me-2" />
              )}
              حذف
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التغييرات'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
