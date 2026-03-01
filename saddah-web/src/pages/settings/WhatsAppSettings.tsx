import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  MessageCircle,
  Phone,
  Key,
  Link,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  useWhatsAppConfig,
  useUpdateWhatsAppConfig,
  useTestWhatsAppConnection,
  useActivateWhatsApp,
  useDeactivateWhatsApp,
  useDeleteWhatsAppConfig,
  useRotateWhatsAppSecret,
} from '@/hooks/useSettings';
import type { WhatsAppProvider, UpdateWhatsAppConfigDto } from '@/services/settings.api';

interface WhatsAppSettingsProps {
  onSave?: () => void;
}

export function WhatsAppSettings({ onSave }: WhatsAppSettingsProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { data: configResponse, isLoading, error } = useWhatsAppConfig();
  const updateConfig = useUpdateWhatsAppConfig();
  const testConnection = useTestWhatsAppConnection();
  const activateWhatsApp = useActivateWhatsApp();
  const deactivateWhatsApp = useDeactivateWhatsApp();
  const deleteConfig = useDeleteWhatsAppConfig();
  const rotateSecret = useRotateWhatsAppSecret();

  const config = configResponse?.config;
  const isConfigured = configResponse?.configured ?? false;

  // Local form state
  const [provider, setProvider] = useState<WhatsAppProvider>('meta');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Twilio credentials
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');

  // Meta credentials
  const [metaToken, setMetaToken] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');

  // Sync form with existing config
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setPhoneNumber(config.phoneNumber || '');
    }
  }, [config]);

  const handleCopyWebhook = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
  };

  const handleProviderChange = (newProvider: WhatsAppProvider) => {
    setProvider(newProvider);
    // Clear credentials when switching provider
    if (newProvider === 'twilio') {
      setMetaToken('');
      setMetaPhoneNumberId('');
      setMetaBusinessAccountId('');
      setMetaAppSecret('');
    } else {
      setTwilioAccountSid('');
      setTwilioAuthToken('');
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!phoneNumber) {
      toast.error(isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required');
      return;
    }

    const data: UpdateWhatsAppConfigDto = {
      provider,
      phoneNumber,
    };

    if (provider === 'twilio') {
      if (!twilioAccountSid || !twilioAuthToken) {
        toast.error(isRTL ? 'بيانات Twilio مطلوبة' : 'Twilio credentials are required');
        return;
      }
      data.twilioCredentials = {
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
      };
    } else {
      if (!metaToken || !metaPhoneNumberId || !metaBusinessAccountId) {
        toast.error(isRTL ? 'بيانات Meta مطلوبة' : 'Meta credentials are required');
        return;
      }
      data.metaCredentials = {
        token: metaToken,
        phoneNumberId: metaPhoneNumberId,
        businessAccountId: metaBusinessAccountId,
        appSecret: metaAppSecret || undefined,
      };
    }

    try {
      await updateConfig.mutateAsync(data);
      onSave?.();
      // Clear sensitive fields after save
      setTwilioAuthToken('');
      setMetaToken('');
      setMetaAppSecret('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleToggleActive = async () => {
    try {
      if (config?.isActive) {
        await deactivateWhatsApp.mutateAsync();
      } else {
        await activateWhatsApp.mutateAsync();
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteConfig.mutateAsync();
      setShowDeleteConfirm(false);
      // Reset form
      setPhoneNumber('');
      setTwilioAccountSid('');
      setTwilioAuthToken('');
      setMetaToken('');
      setMetaPhoneNumberId('');
      setMetaBusinessAccountId('');
      setMetaAppSecret('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRotateSecret = async () => {
    try {
      await rotateSecret.mutateAsync();
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">
          {isRTL ? 'فشل في تحميل إعدادات الواتساب' : 'Failed to load WhatsApp settings'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'تكامل الواتساب' : 'WhatsApp Integration'}
            </h3>
            <p className="text-sm text-gray-500">
              {isRTL ? 'إدارة إعدادات الواتساب للمحادثات' : 'Manage WhatsApp settings for conversations'}
            </p>
          </div>
        </div>
        {isConfigured && config && (
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                config.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {config.isActive ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isRTL ? 'نشط' : 'Active'}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {isRTL ? 'غير نشط' : 'Inactive'}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Provider Selection */}
      <section>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {isRTL ? 'مزود الخدمة' : 'Service Provider'}
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleProviderChange('meta')}
            className={`p-4 rounded-lg border-2 text-start transition-colors ${
              provider === 'meta'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Meta / Facebook</p>
                <p className="text-sm text-gray-500">WhatsApp Business API</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleProviderChange('twilio')}
            className={`p-4 rounded-lg border-2 text-start transition-colors ${
              provider === 'twilio'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="text-xl">☎️</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Twilio</p>
                <p className="text-sm text-gray-500">Twilio WhatsApp API</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Phone Number */}
      <section>
        <Input
          label={isRTL ? 'رقم الواتساب' : 'WhatsApp Phone Number'}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+966501234567"
          icon={<Phone className="h-4 w-4" />}
          hint={isRTL ? 'رقم الهاتف بالصيغة الدولية' : 'Phone number in international format'}
        />
      </section>

      {/* Credentials */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {isRTL ? 'بيانات الاعتماد' : 'Credentials'}
          </label>
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {showCredentials ? (
              <>
                <EyeOff className="h-4 w-4" />
                {isRTL ? 'إخفاء' : 'Hide'}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                {isRTL ? 'إظهار' : 'Show'}
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {provider === 'twilio' ? (
            <>
              <Input
                label="Account SID"
                value={twilioAccountSid}
                onChange={(e) => setTwilioAccountSid(e.target.value)}
                placeholder={config?.maskedCredentials?.accountSid || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
              />
              <Input
                label="Auth Token"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
              />
            </>
          ) : (
            <>
              <Input
                label="Phone Number ID"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                placeholder={config?.maskedCredentials?.phoneNumberId || 'xxxxxxxxxxxxxxxx'}
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
              />
              <Input
                label="Access Token"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
              />
              <Input
                label="Business Account ID"
                value={metaBusinessAccountId}
                onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                placeholder={config?.maskedCredentials?.businessAccountId || 'xxxxxxxxxxxxxxxx'}
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
              />
              <Input
                label={`App Secret (${isRTL ? 'اختياري' : 'Optional'})`}
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                type={showCredentials ? 'text' : 'password'}
                icon={<Key className="h-4 w-4" />}
                hint={isRTL ? 'للتحقق من الويب هوك' : 'For webhook verification'}
              />
            </>
          )}
        </div>
      </section>

      {/* Webhook Info (if configured) */}
      {isConfigured && config && (
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {isRTL ? 'معلومات الويب هوك' : 'Webhook Information'}
          </label>
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white rounded border text-sm font-mono text-gray-800 overflow-x-auto">
                  {config.webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyWebhook(config.webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {config.webhookSecret && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">Verify Token</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotateSecret}
                    disabled={rotateSecret.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 me-1 ${rotateSecret.isPending ? 'animate-spin' : ''}`} />
                    {isRTL ? 'تجديد' : 'Rotate'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded border text-sm font-mono text-gray-800 overflow-x-auto">
                    {config.webhookSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyWebhook(config.webhookSecret!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {config.isVerified && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">
                  {isRTL ? 'تم التحقق من الاتصال' : 'Connection verified'}
                  {config.lastTestedAt && (
                    <span className="text-gray-500 ms-2">
                      ({new Date(config.lastTestedAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US')})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {isConfigured && config && (
            <>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 me-2" />
                )}
                {isRTL ? 'اختبار الاتصال' : 'Test Connection'}
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleActive}
                disabled={activateWhatsApp.isPending || deactivateWhatsApp.isPending}
                className={config.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
              >
                {(activateWhatsApp.isPending || deactivateWhatsApp.isPending) ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : config.isActive ? (
                  <XCircle className="h-4 w-4 me-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 me-2" />
                )}
                {config.isActive
                  ? (isRTL ? 'إلغاء التفعيل' : 'Deactivate')
                  : (isRTL ? 'تفعيل' : 'Activate')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 me-2" />
                {isRTL ? 'حذف' : 'Delete'}
              </Button>
            </>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={updateConfig.isPending}
        >
          {updateConfig.isPending ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {isRTL ? 'جاري الحفظ...' : 'Saving...'}
            </>
          ) : (
            isRTL ? 'حفظ الإعدادات' : 'Save Settings'
          )}
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isRTL ? 'حذف إعدادات الواتساب' : 'Delete WhatsApp Configuration'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {isRTL
                ? 'هل أنت متأكد من حذف إعدادات الواتساب؟ سيتم فقدان جميع البيانات المتعلقة بالتكامل.'
                : 'Are you sure you want to delete the WhatsApp configuration? All integration data will be lost.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteConfig.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteConfig.isPending ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 me-2" />
                )}
                {isRTL ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
