import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const message =
        apiError.response?.data?.message || t('auth.invalidCredentials');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">ص</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">صداح</h1>
              <p className="text-sm text-gray-500">SADDAH CRM</p>
            </div>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth.welcomeBack')}
            </h2>
            <p className="text-gray-600">{t('auth.enterCredentials')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="name@company.com"
              icon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-[38px] text-gray-400 hover:text-gray-600"
                style={{ position: 'relative', float: 'left', marginTop: '-38px', marginLeft: '8px' }}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">{t('auth.rememberMe')}</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-primary-500 hover:text-primary-600"
              >
                {t('auth.forgotPassword')}
              </a>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t('auth.loginButton')}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2 font-medium">
              بيانات الدخول التجريبية:
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                <span className="font-medium">المدير:</span> admin@saddah.io /
                Admin@123
              </p>
              <p>
                <span className="font-medium">مندوب:</span> ahmad@saddah.io /
                Sales@123
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <h2 className="text-4xl font-bold mb-6">
            نظام إدارة علاقات العملاء
            <br />
            بالذكاء الاصطناعي
          </h2>
          <p className="text-primary-100 text-lg">
            أدر عقاراتك وعملاءك بذكاء مع صداح - المنصة الأولى لإدارة العقارات في
            السعودية
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">97%</div>
              <div className="text-primary-200 text-sm">رضا العملاء</div>
            </div>
            <div>
              <div className="text-3xl font-bold">+500</div>
              <div className="text-primary-200 text-sm">عميل نشط</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-primary-200 text-sm">دعم فني</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
