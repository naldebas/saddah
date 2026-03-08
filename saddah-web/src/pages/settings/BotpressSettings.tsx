import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Key,
  Link,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Settings2,
  Users,
  Target,
  Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  botpressApi,
  type CreateBotpressConfigDto,
} from '@/services/botpress.api';

interface BotpressSettingsProps {
  onSave?: () => void;
}

export function BotpressSettings({ onSave }: BotpressSettingsProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const queryClient = useQueryClient();

  // Fetch config
  const { data: configResponse, isLoading, error } = useQuery({
    queryKey: ['botpress-config'],
    queryFn: botpressApi.getConfig,
  });

  const config = configResponse?.config;
  const isConfigured = configResponse?.configured ?? false;

  // Mutations
  const updateConfig = useMutation({
    mutationFn: botpressApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-config'] });
      toast.success(isRTL ? 'تم حفظ إعدادات Botpress' : 'Botpress settings saved');
      onSave?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || (isRTL ? 'فشل في حفظ الإعدادات' : 'Failed to save settings'));
    },
  });

  const testConnection = useMutation({
    mutationFn: botpressApi.testConnection,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['botpress-config'] });
      if (data.success) {
        toast.success(
          isRTL
            ? `تم التحقق من الاتصال بنجاح - ${data.botName}`
            : `Connection verified - ${data.botName}`
        );
      } else {
        toast.error(data.error || (isRTL ? 'فشل في اختبار الاتصال' : 'Connection test failed'));
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || (isRTL ? 'فشل في اختبار الاتصال' : 'Connection test failed'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: botpressApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-config'] });
      toast.success(isRTL ? 'تم تفعيل Botpress' : 'Botpress activated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || (isRTL ? 'فشل في التفعيل' : 'Failed to activate'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: botpressApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-config'] });
      toast.success(isRTL ? 'تم إلغاء تفعيل Botpress' : 'Botpress deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || (isRTL ? 'فشل في إلغاء التفعيل' : 'Failed to deactivate'));
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: botpressApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-config'] });
      toast.success(isRTL ? 'تم حذف إعدادات Botpress' : 'Botpress configuration deleted');
      // Reset form
      setBotId('');
      setWorkspaceId('');
      setToken('');
      setWebhookSecret('');
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || (isRTL ? 'فشل في الحذف' : 'Failed to delete'));
    },
  });

  // Local form state
  const [botId, setBotId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [token, setToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [autoCreateLead, setAutoCreateLead] = useState(true);
  const [autoConvertDeal, setAutoConvertDeal] = useState(true);
  const [qualificationThreshold, setQualificationThreshold] = useState(60);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync form with existing config
  useEffect(() => {
    if (config) {
      setBotId(config.botId);
      setWorkspaceId(config.workspaceId);
      setAutoCreateLead(config.autoCreateLead);
      setAutoConvertDeal(config.autoConvertDeal);
      setQualificationThreshold(config.qualificationThreshold);
    }
  }, [config]);

  const handleCopyWebhook = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
  };

  const handleSave = async () => {
    if (!botId || !workspaceId) {
      toast.error(isRTL ? 'Bot ID و Workspace ID مطلوبان' : 'Bot ID and Workspace ID are required');
      return;
    }

    if (!isConfigured && !token) {
      toast.error(isRTL ? 'Token مطلوب' : 'Token is required');
      return;
    }

    const data: CreateBotpressConfigDto = {
      botId,
      workspaceId,
      credentials: {
        token: token || config?.maskedCredentials?.token || '',
        webhookSecret: webhookSecret || undefined,
      },
      autoCreateLead,
      autoConvertDeal,
      qualificationThreshold,
    };

    updateConfig.mutate(data);
  };

  const handleToggleActive = () => {
    if (config?.isActive) {
      deactivateMutation.mutate();
    } else {
      activateMutation.mutate();
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
          {isRTL ? 'فشل في تحميل إعدادات Botpress' : 'Failed to load Botpress settings'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
            <Bot className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'تكامل Botpress' : 'Botpress Integration'}
            </h3>
            <p className="text-sm text-gray-500">
              {isRTL ? 'إدارة بوت الواتساب عبر Botpress Cloud' : 'Manage WhatsApp bot via Botpress Cloud'}
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

      {/* Connection Settings */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-gray-500" />
          <h4 className="font-medium text-gray-900">
            {isRTL ? 'إعدادات الاتصال' : 'Connection Settings'}
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bot ID"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            placeholder={config?.botId || 'bp_xxxxxxxxxxxxxxxx'}
            icon={<Bot className="h-4 w-4" />}
          />
          <Input
            label="Workspace ID"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder={config?.workspaceId || 'ws_xxxxxxxxxxxxxxxx'}
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Credentials */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-gray-500" />
            <h4 className="font-medium text-gray-900">
              {isRTL ? 'بيانات الاعتماد' : 'Credentials'}
            </h4>
          </div>
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
          <Input
            label="Personal Access Token (PAT)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={config?.maskedCredentials?.token || '••••••••••••••••••••••••••••••••'}
            type={showCredentials ? 'text' : 'password'}
            icon={<Key className="h-4 w-4" />}
            hint={isRTL ? 'من Botpress Cloud Dashboard' : 'From Botpress Cloud Dashboard'}
          />
          <Input
            label={`Webhook Secret (${isRTL ? 'اختياري' : 'Optional'})`}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="••••••••••••••••••••••••••••••••"
            type={showCredentials ? 'text' : 'password'}
            icon={<Key className="h-4 w-4" />}
            hint={isRTL ? 'للتحقق من طلبات الويب هوك' : 'For webhook request verification'}
          />
        </div>
      </section>

      {/* Automation Settings */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-gray-500" />
          <h4 className="font-medium text-gray-900">
            {isRTL ? 'إعدادات الأتمتة' : 'Automation Settings'}
          </h4>
        </div>
        <div className="space-y-4">
          {/* Auto Create Lead */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {isRTL ? 'إنشاء العملاء المحتملين تلقائياً' : 'Auto-create Leads'}
              </p>
              <p className="text-sm text-gray-500">
                {isRTL ? 'إنشاء عميل محتمل عند اكتمال التأهيل' : 'Create lead when qualification completes'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateLead}
                onChange={(e) => setAutoCreateLead(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Auto Convert to Deal */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {isRTL ? 'تحويل إلى صفقة تلقائياً' : 'Auto-convert to Deal'}
              </p>
              <p className="text-sm text-gray-500">
                {isRTL ? 'تحويل العملاء المؤهلين إلى صفقات' : 'Convert qualified leads to deals automatically'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoConvertDeal}
                onChange={(e) => setAutoConvertDeal(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Qualification Threshold */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-500" />
                <p className="font-medium text-gray-900">
                  {isRTL ? 'حد التأهيل' : 'Qualification Threshold'}
                </p>
              </div>
              <span className="text-lg font-semibold text-primary-600">{qualificationThreshold}%</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {isRTL
                ? 'الحد الأدنى لنقاط التأهيل لتحويل العميل إلى صفقة'
                : 'Minimum qualification score to convert lead to deal'}
            </p>
            <input
              type="range"
              min="0"
              max="100"
              value={qualificationThreshold}
              onChange={(e) => setQualificationThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook Info (if configured) */}
      {isConfigured && config && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Link className="h-5 w-5 text-gray-500" />
            <h4 className="font-medium text-gray-900">
              {isRTL ? 'معلومات الويب هوك' : 'Webhook Information'}
            </h4>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {isRTL ? 'رابط الويب هوك (للتسجيل في Botpress)' : 'Callback URL (register in Botpress)'}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white rounded border text-sm font-mono text-gray-800 overflow-x-auto">
                  {config.callbackUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyWebhook(config.callbackUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
                onClick={() => testConnection.mutate()}
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
                disabled={activateMutation.isPending || deactivateMutation.isPending}
                className={config.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
              >
                {(activateMutation.isPending || deactivateMutation.isPending) ? (
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
                {isRTL ? 'حذف إعدادات Botpress' : 'Delete Botpress Configuration'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {isRTL
                ? 'هل أنت متأكد من حذف إعدادات Botpress؟ سيتم فقدان جميع بيانات محادثات البوت.'
                : 'Are you sure you want to delete the Botpress configuration? All bot conversation data will be lost.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={() => deleteConfigMutation.mutate()}
                disabled={deleteConfigMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteConfigMutation.isPending ? (
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
