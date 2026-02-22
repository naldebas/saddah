import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  Users,
  Briefcase,
  Calendar,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  ConfirmModal,
} from '@/components/ui';
import { companiesApi, type Company } from '@/services/companies.api';
import { contactsApi, type Contact } from '@/services/contacts.api';
import { dealsApi, type Deal } from '@/services/deals.api';
import { EditCompanyModal } from './EditCompanyModal';
import { LinkContactModal } from './LinkContactModal';
import { CreateDealModal } from '../deals/CreateDealModal';

const sizeLabels: Record<string, string> = {
  small: 'صغيرة',
  medium: 'متوسطة',
  large: 'كبيرة',
  enterprise: 'عملاقة',
};

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  open: { label: 'مفتوحة', variant: 'warning' },
  won: { label: 'تم الفوز', variant: 'success' },
  lost: { label: 'خسارة', variant: 'error' },
};

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [companyData, contactsData, dealsData] = await Promise.all([
          companiesApi.getById(id),
          contactsApi.getAll({ limit: 50 }),
          dealsApi.getAll({ companyId: id, limit: 50 }),
        ]);
        setCompany(companyData);
        // Filter contacts by companyId
        setContacts(contactsData.data.filter((c) => c.companyId === id));
        setDeals(dealsData.data);
      } catch (error) {
        console.error('Failed to fetch company:', error);
        toast.error('فشل في تحميل بيانات الشركة');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDeleteCompany = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await companiesApi.delete(id);
      toast.success('تم حذف الشركة بنجاح');
      navigate('/companies');
    } catch (error) {
      console.error('Failed to delete company:', error);
      toast.error('فشل في حذف الشركة');
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

  if (!company) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">الشركة غير موجودة</p>
        <Button
          variant="link"
          onClick={() => navigate('/companies')}
          className="mt-4"
        >
          العودة إلى الشركات
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/companies')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Building2 className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.industry && (
                <p className="text-gray-600">{company.industry}</p>
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
        {/* Sidebar - Company Info */}
        <div className="space-y-6">
          {/* Company Details Card */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">معلومات الشركة</h3>

            {company.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">الهاتف</p>
                  <p className="font-medium ltr-nums">{company.phone}</p>
                </div>
              </div>
            )}

            {company.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                  <p className="font-medium">{company.email}</p>
                </div>
              </div>
            )}

            {company.website && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Globe className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">الموقع الإلكتروني</p>
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              </div>
            )}

            {(company.city || company.address) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">العنوان</p>
                  <p className="font-medium">
                    {company.address && `${company.address}، `}
                    {company.city}
                  </p>
                </div>
              </div>
            )}

            {company.size && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">حجم الشركة</p>
                  <Badge variant="default">{sizeLabels[company.size] || company.size}</Badge>
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
                  {new Date(company.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          </Card>

          {/* Tags */}
          {company.tags && company.tags.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">العلامات</h3>
              <div className="flex flex-wrap gap-2">
                {company.tags.map((tag) => (
                  <Badge key={tag} variant="primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Stats */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">الإحصائيات</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
                <p className="text-sm text-gray-500">جهة اتصال</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <Briefcase className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
                <p className="text-sm text-gray-500">صفقة</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-2">
          <Card className="p-0 overflow-hidden">
            <Tabs defaultTab="contacts">
              <TabList className="px-4">
                <Tab value="contacts">
                  جهات الاتصال ({contacts.length})
                </Tab>
                <Tab value="deals">
                  الصفقات ({deals.length})
                </Tab>
              </TabList>

              {/* Contacts Tab */}
              <TabPanel value="contacts" className="px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">جهات الاتصال</h3>
                  <Button size="sm" onClick={() => setIsContactModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    إضافة جهة اتصال
                  </Button>
                </div>

                {contacts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    لا توجد جهات اتصال لهذه الشركة
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </h4>
                            {contact.title && (
                              <p className="text-sm text-gray-500">{contact.title}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                <span className="ltr-nums">{contact.phone}</span>
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                    لا توجد صفقات لهذه الشركة
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => navigate(`/deals`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{deal.title}</h4>
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
                              {Number(deal.value).toLocaleString('ar-SA')} {deal.currency}
                            </p>
                            <Badge variant={statusLabels[deal.status]?.variant || 'default'}>
                              {statusLabels[deal.status]?.label || deal.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
        onSuccess={(updatedCompany) => {
          setCompany(updatedCompany);
          setIsEditModalOpen(false);
          toast.success('تم تحديث الشركة بنجاح');
        }}
      />

      {/* Link Contact Modal */}
      <LinkContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        companyId={id || ''}
        companyName={company.name}
        onSuccess={() => {
          setIsContactModalOpen(false);
          // Refresh contacts list
          if (id) {
            contactsApi.getAll({ limit: 50 }).then((data) => {
              setContacts(data.data.filter((c) => c.companyId === id));
            });
          }
          toast.success('تم ربط جهة الاتصال بالشركة بنجاح');
        }}
      />

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        defaultCompanyId={id}
        onSuccess={() => {
          setIsDealModalOpen(false);
          // Refresh deals list
          if (id) {
            dealsApi.getAll({ companyId: id, limit: 50 }).then((data) => {
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
        onConfirm={handleDeleteCompany}
        title="حذف الشركة"
        message={`هل أنت متأكد من حذف "${company.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
