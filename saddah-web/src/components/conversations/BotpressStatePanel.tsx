import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bot,
  User,
  RefreshCw,
  Play,
  Pause,
  Target,
  Calendar,
  MapPin,
  Banknote,
  Home,
  Clock,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { botpressApi, type BotpressConversation } from '@/services/botpress.api';

interface BotpressStatePanelProps {
  conversation: BotpressConversation;
  onRefresh?: () => void;
}

export function BotpressStatePanel({ conversation, onRefresh }: BotpressStatePanelProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const queryClient = useQueryClient();

  const handoffMutation = useMutation({
    mutationFn: () => botpressApi.handoff(conversation.conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-conversation', conversation.conversationId] });
      toast.success(isRTL ? 'تم تحويل المحادثة للموظف' : 'Conversation handed off to agent');
      onRefresh?.();
    },
    onError: () => {
      toast.error(isRTL ? 'فشل في تحويل المحادثة' : 'Failed to handoff conversation');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => botpressApi.resume(conversation.conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-conversation', conversation.conversationId] });
      toast.success(isRTL ? 'تم استئناف البوت' : 'Bot resumed');
      onRefresh?.();
    },
    onError: () => {
      toast.error(isRTL ? 'فشل في استئناف البوت' : 'Failed to resume bot');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => botpressApi.sync(conversation.conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botpress-conversation', conversation.conversationId] });
      toast.success(isRTL ? 'تم مزامنة الحالة' : 'State synced');
      onRefresh?.();
    },
    onError: () => {
      toast.error(isRTL ? 'فشل في المزامنة' : 'Failed to sync');
    },
  });

  const qualData = conversation.qualificationData as Record<string, any> || {};
  const isInHandoff = conversation.botpressState === 'human_handoff';

  const getStateLabel = (state?: string) => {
    if (!state) return isRTL ? 'غير محدد' : 'Unknown';

    const stateLabels: Record<string, { ar: string; en: string }> = {
      initial: { ar: 'بداية', en: 'Initial' },
      greeting: { ar: 'ترحيب', en: 'Greeting' },
      collecting_info: { ar: 'جمع المعلومات', en: 'Collecting Info' },
      qualified: { ar: 'مؤهل', en: 'Qualified' },
      human_handoff: { ar: 'تحويل للموظف', en: 'Human Handoff' },
      ended: { ar: 'منتهي', en: 'Ended' },
      active: { ar: 'نشط', en: 'Active' },
    };

    const label = stateLabels[state];
    return label ? (isRTL ? label.ar : label.en) : state;
  };

  const getStateColor = (state?: string) => {
    const colors: Record<string, string> = {
      initial: 'bg-gray-100 text-gray-700',
      greeting: 'bg-blue-100 text-blue-700',
      collecting_info: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-green-100 text-green-700',
      human_handoff: 'bg-orange-100 text-orange-700',
      ended: 'bg-gray-100 text-gray-600',
      active: 'bg-green-100 text-green-700',
    };
    return colors[state || ''] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">
            {isRTL ? 'حالة Botpress' : 'Botpress State'}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(conversation.botpressState || '')}`}>
          {getStateLabel(conversation.botpressState || undefined)}
        </span>
      </div>

      {/* Qualification Score */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {isRTL ? 'درجة التأهيل' : 'Qualification Score'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                conversation.qualificationScore >= 60
                  ? 'bg-green-500'
                  : conversation.qualificationScore >= 30
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${conversation.qualificationScore}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{conversation.qualificationScore}%</span>
        </div>
      </div>

      {/* Qualification Data */}
      {Object.keys(qualData).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">
            {isRTL ? 'بيانات التأهيل' : 'Qualification Data'}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {qualData.name && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600 truncate">{qualData.name}</span>
              </div>
            )}
            {qualData.propertyType && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Home className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600 truncate">{qualData.propertyType}</span>
              </div>
            )}
            {qualData.location?.city && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600 truncate">{qualData.location.city}</span>
              </div>
            )}
            {qualData.budget?.max && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Banknote className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600 truncate">
                  {qualData.budget.max.toLocaleString()} {qualData.budget.currency || 'SAR'}
                </span>
              </div>
            )}
            {qualData.timeline && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600 truncate">{qualData.timeline}</span>
              </div>
            )}
            {qualData.financingNeeded !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-600">
                  {qualData.financingNeeded
                    ? (isRTL ? 'يحتاج تمويل' : 'Needs Financing')
                    : (isRTL ? 'لا يحتاج تمويل' : 'No Financing')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Synced */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Calendar className="h-3 w-3" />
        <span>
          {isRTL ? 'آخر مزامنة:' : 'Last synced:'}{' '}
          {new Date(conversation.lastSyncedAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ms-1">{isRTL ? 'مزامنة' : 'Sync'}</span>
        </Button>

        {isInHandoff ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
            className="text-green-600 hover:text-green-700"
          >
            {resumeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="ms-1">{isRTL ? 'استئناف البوت' : 'Resume Bot'}</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handoffMutation.mutate()}
            disabled={handoffMutation.isPending}
            className="text-orange-600 hover:text-orange-700"
          >
            {handoffMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
            <span className="ms-1">{isRTL ? 'تحويل للموظف' : 'Handoff'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
