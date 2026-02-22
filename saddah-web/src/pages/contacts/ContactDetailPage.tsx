import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  User,
  Calendar,
  Edit,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Video,
  PhoneCall,
  MapPin,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  ConfirmModal,
} from '@/components/ui';
import { contactsApi, type Contact } from '@/services/contacts.api';
import { activitiesApi, type Activity } from '@/services/activities.api';
import { dealsApi, type Deal } from '@/services/deals.api';
import { EditContactModal } from './EditContactModal';
import { CreateActivityModal } from '../activities/CreateActivityModal';
import { CreateDealModal } from '../deals/CreateDealModal';

const activityTypeIcons: Record<string, typeof Phone> = {
  call: PhoneCall,
  meeting: Video,
  email: Mail,
  task: CheckCircle2,
  note: FileText,
  whatsapp: MessageCircle,
  site_visit: MapPin,
};

const activityTypeLabels: Record<string, string> = {
  call: 'مكالمة',
  meeting: 'اجتماع',
  email: 'بريد إلكتروني',
  task: 'مهمة',
  note: 'ملاحظة',
  whatsapp: 'واتساب',
  site_visit: 'زيارة موقع',
};

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  open: { label: 'مفتوحة', variant: 'warning' },
  won: { label: 'تم الفوز', variant: 'success' },
  lost: { label: 'خسارة', variant: 'error' },
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [contactData, activitiesData, dealsData] = await Promise.all([
          contactsApi.getById(id),
          activitiesApi.getAll({ contactId: id, limit: 50 }),
          dealsApi.getAll({ contactId: id, limit: 50 }),
        ]);
        setContact(contactData);
        setActivities(activitiesData.data);
        setDeals(dealsData.data);
      } catch (error) {
        console.error('Failed to fetch contact:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const updated = await activitiesApi.complete(activityId);
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? updated : a))
      );
      toast.success('تم إكمال النشاط');
    } catch (error) {
      console.error('Failed to complete activity:', error);
      toast.error('فشل في إكمال النشاط');
    }
  };

  const handleDeleteContact = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await contactsApi.delete(id);
      toast.success('تم حذف جهة الاتصال بنجاح');
      navigate('/contacts');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('فشل في حذف جهة الاتصال');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">جهة الاتصال غير موجودة</p>
        <Button
          variant="link"
          onClick={() => navigate('/contacts')}
          className="mt-4"
        >
          العودة إلى جهات الاتصال
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={`${contact.firstName} ${contact.lastName}`}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h1>
              {contact.title && (
                <p className="text-gray-600">{contact.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
              <Edit className="h-4 w-4" />
              تعديل
            </Button>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sidebar - Contact Info */}
        <div className="space-y-6">
          {/* Contact Details Card */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">معلومات التواصل</h3>

            {contact.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">الهاتف</p>
                  <p className="font-medium ltr-nums">{contact.phone}</p>
                </div>
              </div>
            )}

            {contact.whatsapp && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">واتساب</p>
                  <p className="font-medium ltr-nums">{contact.whatsapp}</p>
                </div>
              </div>
            )}

            {contact.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                  <p className="font-medium">{contact.email}</p>
                </div>
              </div>
            )}

            {contact.company && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">الشركة</p>
                  <p className="font-medium">{contact.company.name}</p>
                </div>
              </div>
            )}

            {contact.owner && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <User className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">المسؤول</p>
                  <p className="font-medium">
                    {contact.owner.firstName} {contact.owner.lastName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ الإضافة</p>
                <p className="font-medium ltr-nums">
                  {new Date(contact.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          </Card>

          {/* Tags */}
          {contact.tags.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">العلامات</h3>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="col-span-2">
          <Card className="p-0 overflow-hidden">
            <Tabs defaultTab="activities">
              <TabList className="px-4">
                <Tab value="activities">
                  الأنشطة ({activities.length})
                </Tab>
                <Tab value="deals">
                  الصفقات ({deals.length})
                </Tab>
                <Tab value="notes">الملاحظات</Tab>
              </TabList>

              {/* Activities Tab */}
              <TabPanel value="activities" className="px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">الأنشطة</h3>
                  <Button size="sm" onClick={() => setIsActivityModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    إضافة نشاط
                  </Button>
                </div>

                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    لا توجد أنشطة لهذه جهة الاتصال
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const Icon =
                        activityTypeIcons[activity.type] || FileText;
                      const isCompleted = !!activity.completedAt;

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <button
                            onClick={() =>
                              !isCompleted &&
                              handleCompleteActivity(activity.id)
                            }
                            className={`mt-0.5 ${
                              isCompleted
                                ? 'text-success-500'
                                : 'text-gray-400 hover:text-primary-500'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-400" />
                              <Badge variant="default">
                                {activityTypeLabels[activity.type]}
                              </Badge>
                            </div>
                            <p
                              className={`font-medium mt-1 ${
                                isCompleted
                                  ? 'line-through text-gray-400'
                                  : 'text-gray-900'
                              }`}
                            >
                              {activity.subject}
                            </p>
                            {activity.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              {activity.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {new Date(
                                    activity.dueDate
                                  ).toLocaleDateString('ar-SA')}
                                </span>
                              )}
                              {activity.creator && (
                                <span>
                                  {activity.creator.firstName}{' '}
                                  {activity.creator.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabPanel>

              {/* Deals Tab */}
              <TabPanel value="deals" className="px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">الصفقات</h3>
                  <Button size="sm" onClick={() => setIsDealModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    إضافة صفقة
                  </Button>
                </div>

                {deals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    لا توجد صفقات لهذه جهة الاتصال
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {deal.title}
                            </h4>
                            {deal.stage && (
                              <div className="flex items-center gap-2 mt-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: deal.stage.color }}
                                />
                                <span className="text-sm text-gray-500">
                                  {deal.stage.name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <p className="font-semibold text-gray-900 ltr-nums">
                              {Number(deal.value).toLocaleString('ar-SA')}{' '}
                              {deal.currency}
                            </p>
                            <Badge variant={statusLabels[deal.status].variant}>
                              {statusLabels[deal.status].label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>

              {/* Notes Tab */}
              <TabPanel value="notes" className="px-4">
                <p className="text-gray-500 text-center py-8">
                  قريباً - سجل الملاحظات
                </p>
              </TabPanel>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Edit Contact Modal */}
      <EditContactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        contact={contact}
        onSuccess={(updatedContact) => {
          setContact(updatedContact);
          setIsEditModalOpen(false);
          toast.success('تم تحديث جهة الاتصال بنجاح');
        }}
      />

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        contactId={id}
        onSuccess={() => {
          setIsActivityModalOpen(false);
          // Refresh activities list
          if (id) {
            activitiesApi.getAll({ contactId: id, limit: 50 }).then((data) => {
              setActivities(data.data);
            });
          }
          toast.success('تمت إضافة النشاط بنجاح');
        }}
      />

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        defaultContactId={id}
        onSuccess={() => {
          setIsDealModalOpen(false);
          // Refresh deals list
          if (id) {
            dealsApi.getAll({ contactId: id, limit: 50 }).then((data) => {
              setDeals(data.data);
            });
          }
          toast.success('تمت إضافة الصفقة بنجاح');
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteContact}
        title="حذف جهة الاتصال"
        message={`هل أنت متأكد من حذف "${contact.firstName} ${contact.lastName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
