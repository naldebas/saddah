import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

interface PageErrorProps {
  title?: string;
  message?: string;
  statusCode?: number;
  showBackButton?: boolean;
  onRetry?: () => void;
}

/**
 * Page-level error component for 404, 403, 500, etc.
 */
export function PageError({
  title,
  message,
  statusCode,
  showBackButton = true,
  onRetry,
}: PageErrorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getErrorContent = () => {
    switch (statusCode) {
      case 404:
        return {
          title: t('errors.notFound', 'الصفحة غير موجودة'),
          message: t('errors.notFoundMessage', 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'),
          icon: '404',
        };
      case 403:
        return {
          title: t('errors.forbidden', 'غير مصرح'),
          message: t('errors.forbiddenMessage', 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'),
          icon: '403',
        };
      case 500:
        return {
          title: t('errors.serverError', 'خطأ في الخادم'),
          message: t('errors.serverErrorMessage', 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.'),
          icon: '500',
        };
      default:
        return {
          title: title || t('errors.error', 'خطأ'),
          message: message || t('errors.genericMessage', 'حدث خطأ غير متوقع.'),
          icon: 'error',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {statusCode ? (
          <div className="text-8xl font-bold text-gray-200 mb-4">{statusCode}</div>
        ) : (
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-gray-600 mb-8">{content.message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              <RefreshCw className="w-4 h-4 ml-2" />
              {t('common.retry', 'إعادة المحاولة')}
            </Button>
          )}
          {showBackButton && (
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              {t('common.goBack', 'العودة')}
            </Button>
          )}
          <Button onClick={() => navigate('/')} variant="outline">
            {t('errors.goHome', 'الرئيسية')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PageError;
