import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Briefcase,
  UserPlus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/Card';
import { dashboardApi, DashboardStats, PipelineStage } from '@/services/dashboard.api';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

function StatCard({ title, value, change, icon, iconBg, loading }: StatCardProps) {
  const isPositive = change && change > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${iconBg} animate-pulse`}>
            <div className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900 ltr-nums">{value}</p>
            {change !== undefined && (
              <span
                className={`flex items-center text-sm font-medium ${
                  isPositive ? 'text-success-500' : 'text-error-500'
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span className="ltr-nums">{Math.abs(change)}%</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-5 w-5 text-blue-500" />,
  email: <Mail className="h-5 w-5 text-green-500" />,
  meeting: <Calendar className="h-5 w-5 text-purple-500" />,
  task: <CheckCircle2 className="h-5 w-5 text-orange-500" />,
  follow_up: <Clock className="h-5 w-5 text-yellow-500" />,
  note: <Users className="h-5 w-5 text-gray-500" />,
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, activitiesData, pipelineData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentActivities(5),
          dashboardApi.getPipelineStats(),
        ]);
        setStats(statsData);
        setActivities(activitiesData as Activity[]);
        setPipelineStats(pipelineData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('فشل في تحميل بيانات لوحة التحكم');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('ar-SA');
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcome')}، {user?.firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          إليك ملخص أنشطتك اليوم
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalContacts')}
          value={stats?.contacts.total || 0}
          change={stats?.contacts.change}
          icon={<Users className="h-6 w-6 text-primary-600" />}
          iconBg="bg-primary-100"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.openDeals')}
          value={stats?.deals.open || 0}
          change={stats?.deals.change}
          icon={<Briefcase className="h-6 w-6 text-secondary-600" />}
          iconBg="bg-secondary-100"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.totalLeads')}
          value={stats?.leads.total || 0}
          change={stats?.leads.change}
          icon={<UserPlus className="h-6 w-6 text-info-500" />}
          iconBg="bg-info-50"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.revenue')}
          value={formatValue(stats?.deals.totalValue || 0)}
          change={15}
          icon={<TrendingUp className="h-6 w-6 text-success-500" />}
          iconBg="bg-success-50"
          loading={loading}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-green-700 ltr-nums">
              {stats?.deals.won || 0}
            </p>
            <p className="text-sm text-green-600">{t('dashboard.wonDeals')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-blue-700 ltr-nums">
              {stats?.leads.new || 0}
            </p>
            <p className="text-sm text-blue-600">عملاء جدد</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-yellow-700 ltr-nums">
              {stats?.activities.upcoming || 0}
            </p>
            <p className="text-sm text-yellow-600">أنشطة قادمة</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="text-center py-4">
            <p className="text-3xl font-bold text-red-700 ltr-nums">
              {stats?.activities.overdue || 0}
            </p>
            <p className="text-sm text-red-600">متأخرة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activities */}
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">آخر الأنشطة</h2>
          </div>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {activityIcons[activity.type] || <Users className="h-5 w-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.assignedTo
                          ? `${activity.assignedTo.firstName} ${activity.assignedTo.lastName}`
                          : activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ltr-nums whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد أنشطة حديثة
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline summary */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">مراحل المبيعات</h2>
          </div>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : pipelineStats.length > 0 ? (
              <div className="space-y-4">
                {pipelineStats.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <span className="flex-1 text-sm text-gray-600">{stage.name}</span>
                    <span className="text-sm font-medium text-gray-900 ltr-nums">
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد صفقات في المسار
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion rate card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">معدل التحويل</h2>
          </div>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#10b981"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(stats?.leads.conversionRate || 0) * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 ltr-nums">
                    {(stats?.leads.conversionRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">
              من العملاء المحتملين إلى جهات اتصال
            </p>
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">ملخص اليوم</h2>
          </div>
          <CardContent>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">الأنشطة المكتملة</span>
                <span className="font-semibold text-green-600 ltr-nums">
                  {stats?.activities.completedToday || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">العملاء المؤهلين</span>
                <span className="font-semibold text-blue-600 ltr-nums">
                  {stats?.leads.qualified || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">إجمالي الصفقات</span>
                <span className="font-semibold text-purple-600 ltr-nums">
                  {stats?.deals.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">قيمة الصفقات المفتوحة</span>
                <span className="font-semibold text-orange-600 ltr-nums">
                  {formatValue(stats?.deals.totalValue || 0)} ر.س
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
