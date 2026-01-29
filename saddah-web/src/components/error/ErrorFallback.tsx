import { ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onReset?: () => void;
  showDetails?: boolean;
  title?: string;
  message?: string;
}

/**
 * Fallback UI displayed when an error is caught
 */
export function ErrorFallback({
  error,
  errorInfo,
  onReset,
  showDetails = false,
  title,
  message,
}: ErrorFallbackProps) {
  const { t } = useTranslation();
  const [showStack, setShowStack] = useState(false);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleRefresh = () => {
    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {title || t('errors.somethingWentWrong', 'حدث خطأ غير متوقع')}
        </h2>

        <p className="text-gray-600 mb-6">
          {message || t('errors.errorMessage', 'نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button onClick={handleRefresh} variant="primary">
            <RefreshCw className="w-4 h-4 ml-2" />
            {t('errors.tryAgain', 'حاول مرة أخرى')}
          </Button>
          <Button onClick={handleGoHome} variant="outline">
            <Home className="w-4 h-4 ml-2" />
            {t('errors.goHome', 'العودة للرئيسية')}
          </Button>
        </div>

        {showDetails && error && (
          <div className="text-right bg-gray-50 rounded-lg p-4 border border-gray-200">
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>{t('errors.technicalDetails', 'التفاصيل التقنية')}</span>
              {showStack ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showStack && (
              <div className="mt-4 text-left" dir="ltr">
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-sm font-medium text-red-800">{error.name}</p>
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>

                {error.stack && (
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-48">
                    {error.stack}
                  </pre>
                )}

                {errorInfo?.componentStack && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Component Stack:</p>
                    <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorFallback;
