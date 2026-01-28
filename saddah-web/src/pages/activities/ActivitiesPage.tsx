import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  MessageSquare,
  FileText,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { activitiesApi, Activity } from '@/services/activities.api';
import { CreateActivityModal } from './CreateActivityModal';
import { ActivityDetailModal } from './ActivityDetailModal';

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  task: <CheckCircle className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  whatsapp: <MessageSquare className="w-4 h-4" />,
  site_visit: <MapPin className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  call: 'مكالمة',
  meeting: 'اجتماع',
  email: 'بريد إلكتروني',
  task: 'مهمة',
  note: 'ملاحظة',
  whatsapp: 'واتساب',
  site_visit: 'زيارة موقع',
};

const typeColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  call: 'primary',
  meeting: 'warning',
  email: 'info',
  task: 'success',
  note: 'default',
  whatsapp: 'success',
  site_visit: 'warning',
};

// Full Tailwind classes to avoid purging issues with dynamic class names
const typeBgColors: Record<string, string> = {
  call: 'bg-blue-100',
  meeting: 'bg-yellow-100',
  email: 'bg-cyan-100',
  task: 'bg-green-100',
  note: 'bg-gray-100',
  whatsapp: 'bg-green-100',
  site_visit: 'bg-orange-100',
};

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [completedFilter, setCompletedFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await activitiesApi.getAll({
        page: currentPage,
        limit: 20,
        type: typeFilter || undefined,
        isCompleted: completedFilter === '' ? undefined : completedFilter === 'true',
        sortBy,
        sortOrder,
      });
      setActivities(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('فشل في تحميل الأنشطة');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [currentPage, typeFilter, completedFilter, sortBy, sortOrder]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleComplete = async (id: string) => {
    try {
      await activitiesApi.complete(id);
      fetchActivities();
      toast.success('تم إكمال النشاط بنجاح');
    } catch (error) {
      console.error('Error completing activity:', error);
      toast.error('فشل في إكمال النشاط');
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchActivities();
    toast.success('تم إضافة النشاط بنجاح');
  };

  const handleRowClick = (activity: Activity) => {
    setSelectedActivityId(activity.id);
    setIsDetailModalOpen(true);
  };

  const handleActivityUpdated = () => {
    fetchActivities();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDate: string | null, completedAt: string | null) => {
    if (!dueDate || completedAt) return false;
    return new Date(dueDate) < new Date();
  };

  const columns: Column<Activity>[] = [
    {
      key: 'type',
      header: 'النوع',
      cell: (activity: Activity) => (
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${typeBgColors[activity.type] || 'bg-gray-100'}`}>
            {typeIcons[activity.type]}
          </div>
          <Badge variant={typeColors[activity.type]}>
            {typeLabels[activity.type] || activity.type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'الموضوع',
      sortable: true,
      cell: (activity: Activity) => (
        <div>
          <p className="font-medium text-gray-900">{activity.subject}</p>
          {activity.description && (
            <p className="text-sm text-gray-500 line-clamp-1">{activity.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'جهة الاتصال',
      cell: (activity: Activity) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {activity.contact
              ? `${activity.contact.firstName} ${activity.contact.lastName}`
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'deal',
      header: 'الصفقة',
      cell: (activity: Activity) => (
        <span className="text-sm text-gray-600">
          {activity.deal?.title || '-'}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'تاريخ الاستحقاق',
      sortable: true,
      cell: (activity: Activity) => (
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isOverdue(activity.dueDate, activity.completedAt) ? 'text-red-500' : 'text-gray-400'}`} />
          <span className={`text-sm ${isOverdue(activity.dueDate, activity.completedAt) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {formatDate(activity.dueDate)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (activity: Activity) => (
        <Badge variant={activity.completedAt ? 'success' : isOverdue(activity.dueDate, activity.completedAt) ? 'error' : 'warning'}>
          {activity.completedAt ? 'مكتمل' : isOverdue(activity.dueDate, activity.completedAt) ? 'متأخر' : 'معلق'}
        </Badge>
      ),
    },
    {
      key: 'creator',
      header: 'بواسطة',
      cell: (activity: Activity) => (
        <span className="text-sm text-gray-600">
          {activity.creator
            ? `${activity.creator.firstName} ${activity.creator.lastName}`
            : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'إجراءات',
      cell: (activity: Activity) => (
        <div className="flex items-center gap-2">
          {!activity.completedAt && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete(activity.id);
              }}
            >
              <CheckCircle className="w-4 h-4 ml-1" />
              إكمال
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Calculate statistics
  const completedActivities = activities.filter((a) => a.completedAt).length;
  const pendingActivities = activities.filter((a) => !a.completedAt).length;
  const overdueActivities = activities.filter((a) => isOverdue(a.dueDate, a.completedAt)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأنشطة</h1>
          <p className="text-gray-600 mt-1">إدارة ومتابعة جميع الأنشطة</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة نشاط
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الأنشطة</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مكتملة</p>
              <p className="text-2xl font-bold text-green-600">{completedActivities}</p>
            </div>
            <Badge variant="success">مكتمل</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">معلقة</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingActivities}</p>
            </div>
            <Badge variant="warning">معلق</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">متأخرة</p>
              <p className="text-2xl font-bold text-red-600">{overdueActivities}</p>
            </div>
            <Badge variant="error">متأخر</Badge>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="نوع النشاط"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الأنواع</option>
            <option value="call">مكالمة</option>
            <option value="meeting">اجتماع</option>
            <option value="email">بريد إلكتروني</option>
            <option value="task">مهمة</option>
            <option value="note">ملاحظة</option>
            <option value="whatsapp">واتساب</option>
            <option value="site_visit">زيارة موقع</option>
          </Select>
          <Select
            label="الحالة"
            value={completedFilter}
            onChange={(e) => {
              setCompletedFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الحالات</option>
            <option value="false">معلقة</option>
            <option value="true">مكتملة</option>
          </Select>
        </div>
      </Card>

      {/* Activities Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          data={activities}
          columns={columns}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onSort={handleSort}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          emptyMessage="لا توجد أنشطة"
          onRowClick={handleRowClick}
        />
      )}

      {/* Create Modal */}
      <CreateActivityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Detail Modal */}
      <ActivityDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedActivityId(null);
        }}
        activityId={selectedActivityId}
        onActivityUpdated={handleActivityUpdated}
      />
    </div>
  );
}

export default ActivitiesPage;
