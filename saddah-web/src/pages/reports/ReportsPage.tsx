import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  Download,
  PieChart as PieChartIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  reportsApi,
  downloadFile,
  SalesReport,
  LeadsReport,
  ActivitiesReport,
  ReportQueryParams,
} from '@/services/reports.api';

type ReportPeriod = 'this_week' | 'this_month' | 'this_quarter' | 'this_year';

export function ReportsPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('this_month');

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [leadsReport, setLeadsReport] = useState<LeadsReport | null>(null);
  const [activitiesReport, setActivitiesReport] = useState<ActivitiesReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params: ReportQueryParams = { period };
      const [sales, leads, activities] = await Promise.all([
        reportsApi.getSalesReport(params),
        reportsApi.getLeadsReport(params),
        reportsApi.getActivitiesReport(params),
      ]);
      setSalesReport(sales);
      setLeadsReport(leads);
      setActivitiesReport(activities);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('فشل في تحميل التقارير');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: 'deals' | 'leads' | 'activities') => {
    setExporting(type);
    try {
      const params: ReportQueryParams = { period };
      let blob: Blob;
      let filename: string;

      switch (type) {
        case 'deals':
          blob = await reportsApi.exportDeals(params);
          filename = `deals-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'leads':
          blob = await reportsApi.exportLeads(params);
          filename = `leads-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'activities':
          blob = await reportsApi.exportActivities(params);
          filename = `activities-${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      downloadFile(blob, filename);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('فشل في تصدير التقرير');
    } finally {
      setExporting(null);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ر.س`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ر.س`;
    }
    return `${value} ر.س`;
  };

  const periodLabels: Record<ReportPeriod, string> = {
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    this_quarter: 'هذا الربع',
    this_year: 'هذا العام',
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: {entry.name.includes('قيمة') || entry.name.includes('value')
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const pieColors = ['#3B82F6', '#10B981', '#25D366', '#F59E0B', '#6B7280', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.reports')}</h1>
          <p className="text-gray-500 mt-1">تقارير وتحليلات شاملة لأداء الأعمال</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative">
            <Button variant="outline" onClick={() => handleExport('deals')} disabled={!!exporting}>
              {exporting === 'deals' ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Download className="h-4 w-4 me-2" />
              )}
              تصدير الصفقات
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">إجمالي قيمة الصفقات المكسوبة</p>
                <p className="text-2xl font-bold ltr-nums">{formatCurrency(salesReport?.summary.wonValue || 0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-primary-100">
                    {salesReport?.summary.wonDeals || 0} صفقة مكسوبة
                  </span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">الصفقات المفتوحة</p>
                <p className="text-2xl font-bold ltr-nums">{salesReport?.summary.openDeals || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-green-100">
                    {formatCurrency(salesReport?.summary.openValue || 0)}
                  </span>
                </div>
              </div>
              <Briefcase className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">العملاء المحتملين</p>
                <p className="text-2xl font-bold ltr-nums">{leadsReport?.summary.totalLeads || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-blue-100">
                    {leadsReport?.summary.convertedLeads || 0} محوّل
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">معدل التحويل</p>
                <p className="text-2xl font-bold ltr-nums">{salesReport?.summary.conversionRate || 0}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-orange-100">
                    متوسط الصفقة: {formatCurrency(salesReport?.summary.avgDealValue || 0)}
                  </span>
                </div>
              </div>
              <PieChartIcon className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Stage */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">الصفقات حسب المرحلة</h2>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <CardContent>
            <div className="h-72">
              {salesReport?.byStage && salesReport.byStage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.byStage} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis
                      dataKey="stageName"
                      type="category"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="عدد الصفقات" radius={[0, 4, 4, 0]}>
                      {salesReport.byStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.stageColor || pieColors[index % pieColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  لا توجد بيانات
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources Pie Chart */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">توزيع مصادر العملاء المحتملين</h2>
              <PieChartIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <CardContent>
            <div className="h-72 flex items-center">
              {leadsReport?.bySource && leadsReport.bySource.length > 0 ? (
                <>
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsReport.bySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="sourceLabel"
                      >
                        {leadsReport.bySource.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {leadsReport.bySource.map((source, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm text-gray-700">{source.sourceLabel}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{source.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  لا توجد بيانات
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance by User */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">أداء فريق المبيعات</h2>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <CardContent>
            <div className="h-72">
              {salesReport?.byUser && salesReport.byUser.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.byUser} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="userName" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="dealsWon" name="صفقات مكسوبة" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="totalValue" name="إجمالي القيمة" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  لا توجد بيانات
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activities by Type */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">الأنشطة حسب النوع</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <CardContent>
            <div className="h-72 flex items-center">
              {activitiesReport?.byType && activitiesReport.byType.length > 0 ? (
                <>
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie
                        data={activitiesReport.byType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="typeLabel"
                      >
                        {activitiesReport.byType.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {activitiesReport.byType.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm text-gray-700">{activity.typeLabel}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{activity.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  لا توجد بيانات
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">ملخص الأنشطة</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('activities')}
              disabled={!!exporting}
            >
              {exporting === 'activities' ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Download className="h-4 w-4 me-2" />
              )}
              تصدير
            </Button>
          </div>
        </div>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">إجمالي الأنشطة</p>
                  <p className="text-xl font-bold text-blue-900">{activitiesReport?.summary.totalActivities || 0}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">مكتملة</p>
                  <p className="text-xl font-bold text-green-900">{activitiesReport?.summary.completedActivities || 0}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600">متأخرة</p>
                  <p className="text-xl font-bold text-red-900">{activitiesReport?.summary.overdueActivities || 0}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600">نسبة الإنجاز</p>
                  <p className="text-xl font-bold text-purple-900">{activitiesReport?.summary.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Summary */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">ملخص العملاء المحتملين</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('leads')}
              disabled={!!exporting}
            >
              {exporting === 'leads' ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Download className="h-4 w-4 me-2" />
              )}
              تصدير
            </Button>
          </div>
        </div>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">حسب الحالة</h3>
              <div className="space-y-2">
                {leadsReport?.byStatus?.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{status.statusLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{status.count}</span>
                      <span className="text-xs text-gray-500">({status.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* By Grade */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">حسب التصنيف</h3>
              <div className="space-y-2">
                {leadsReport?.byGrade?.map((grade, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{grade.gradeLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{grade.count}</span>
                      <span className="text-xs text-gray-500">({grade.percentage}%)</span>
                    </div>
                  </div>
                ))}
                {(!leadsReport?.byGrade || leadsReport.byGrade.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
