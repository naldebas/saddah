import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  CheckCircle,
  MessageSquare,
  FileText,
  MapPin,
  Clock,
  User,
  Briefcase,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Badge,
  Spinner,
  ConfirmModal,
} from '@/components/ui';
import { activitiesApi, type Activity } from '@/services/activities.api';
import { useAuthStore } from '@/stores/authStore';

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string | null;
  onActivityUpdated: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-5 w-5" />,
  meeting: <CalendarIcon className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  task: <CheckCircle className="h-5 w-5" />,
  note: <FileText className="h-5 w-5" />,
  whatsapp: <MessageSquare className="h-5 w-5" />,
  site_visit: <MapPin className="h-5 w-5" />,
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

const typeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-600',
  meeting: 'bg-yellow-100 text-yellow-600',
  email: 'bg-purple-100 text-purple-600',
  task: 'bg-green-100 text-green-600',
  note: 'bg-gray-100 text-gray-600',
  whatsapp: 'bg-green-100 text-green-600',
  site_visit: 'bg-orange-100 text-orange-600',
};

export function ActivityDetailModal({
  isOpen,
  onClose,
  activityId,
  onActivityUpdated,
}: ActivityDetailModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canDelete = user?.role !== 'sales_rep'; // Only admin and sales_manager can delete

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !activityId) return;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const data = await activitiesApi.getById(activityId);
        setActivity(data);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast.error('فشل في تحميل بيانات النشاط');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [isOpen, activityId]);

  const handleDelete = async () => {
    if (!activityId) return;
    setIsDeleting(true);
    try {
      await activitiesApi.delete(activityId);
      toast.success('تم حذف النشاط بنجاح');
      setIsDeleteModalOpen(false);
      onClose();
      onActivityUpdated();
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast.error('فشل في حذف النشاط');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (!activityId) return;
    setIsCompleting(true);
    try {
      const updatedActivity = await activitiesApi.complete(activityId);
      setActivity(updatedActivity);
      toast.success('تم إكمال النشاط بنجاح');
      onActivityUpdated();
    } catch (error) {
      console.error('Failed to complete activity:', error);
      toast.error('فشل في إكمال النشاط');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = activity?.dueDate && !activity?.completedAt && new Date(activity.dueDate) < new Date();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Side Panel */}
      <div className="fixed inset-y-0 end-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">تفاصيل النشاط</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : activity ? (
            <div className="p-6 space-y-6">
              {/* Activity Type & Status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${typeColors[activity.type]}`}>
                    {typeIcons[activity.type]}
                  </div>
                  <div>
                    <Badge variant={activity.completedAt ? 'success' : isOverdue ? 'error' : 'warning'}>
                      {activity.completedAt ? 'مكتمل' : isOverdue ? 'متأخر' : 'معلق'}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      {typeLabels[activity.type] || activity.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{activity.subject}</h3>
                {activity.description && (
                  <p className="text-gray-600 mt-2">{activity.description}</p>
                )}
              </div>

              {/* Due Date */}
              {activity.dueDate && (
                <div className={`p-4 rounded-xl ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`} />
                    <span className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                      تاريخ الاستحقاق
                    </span>
                  </div>
                  <p className={`font-medium mt-1 ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatDate(activity.dueDate)}
                  </p>
                </div>
              )}

              {/* Completed At */}
              {activity.completedAt && (
                <div className="p-4 rounded-xl bg-green-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">تاريخ الإكمال</span>
                  </div>
                  <p className="font-medium mt-1 text-green-700">
                    {formatDate(activity.completedAt)}
                  </p>
                </div>
              )}

              {/* Contact */}
              {activity.contact && (
                <div
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    onClose();
                    navigate(`/contacts/${activity.contact!.id}`);
                  }}
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">جهة الاتصال</p>
                    <p className="font-medium text-gray-900">
                      {activity.contact.firstName} {activity.contact.lastName}
                    </p>
                  </div>
                </div>
              )}

              {/* Deal */}
              {activity.deal && (
                <div
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    onClose();
                    navigate('/deals');
                  }}
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الصفقة</p>
                    <p className="font-medium text-gray-900">{activity.deal.title}</p>
                  </div>
                </div>
              )}

              {/* Creator */}
              {activity.creator && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">بواسطة</p>
                    <p className="font-medium text-gray-900">
                      {activity.creator.firstName} {activity.creator.lastName}
                    </p>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="text-sm text-gray-500">
                تم الإنشاء في: {formatDate(activity.createdAt)}
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t">
                {!activity.completedAt && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleComplete}
                    disabled={isCompleting}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isCompleting ? 'جاري الإكمال...' : 'إكمال النشاط'}
                  </Button>
                )}

                {canDelete && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-error-500 border-error-200 hover:bg-error-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">النشاط غير موجود</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="حذف النشاط"
        message={`هل أنت متأكد من حذف "${activity?.subject}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
