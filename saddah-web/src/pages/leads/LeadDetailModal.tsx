import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Edit,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  Button,
  Badge,
  Spinner,
  ConfirmModal,
  Modal,
  ModalFooter,
  Input,
  Select,
} from '@/components/ui';
import { leadsApi, type Lead, type UpdateLeadDto, type ConvertLeadDto } from '@/services/leads.api';
import { pipelinesApi, type Pipeline } from '@/services/deals.api';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onLeadUpdated: () => void;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  new: 'primary',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'error',
  converted: 'success',
  lost: 'error',
};

const statusLabels: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  unqualified: 'غير مؤهل',
  converted: 'تم التحويل',
  lost: 'مفقود',
};

const sourceLabels: Record<string, string> = {
  manual: 'يدوي',
  whatsapp_bot: 'واتساب بوت',
  voice_bot: 'بوت صوتي',
  web_form: 'نموذج ويب',
  referral: 'إحالة',
  linkedin: 'لينكدإن',
  facebook: 'فيسبوك',
  google_ads: 'إعلانات جوجل',
};

const propertyLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  land: 'أرض',
  commercial: 'تجاري',
  office: 'مكتب',
  warehouse: 'مستودع',
};

const timelineLabels: Record<string, string> = {
  immediate: 'فوري',
  '1_month': 'خلال شهر',
  '3_months': 'خلال 3 أشهر',
  '6_months': 'خلال 6 أشهر',
  '1_year': 'خلال سنة',
  undecided: 'غير محدد',
};

export function LeadDetailModal({
  isOpen,
  onClose,
  leadId,
  onLeadUpdated,
}: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [editData, setEditData] = useState<UpdateLeadDto>({});
  const [convertData, setConvertData] = useState<ConvertLeadDto>({
    dealTitle: '',
    pipelineId: '',
  });

  useEffect(() => {
    if (!isOpen || !leadId) return;

    const fetchLead = async () => {
      setIsLoading(true);
      try {
        const data = await leadsApi.getOne(leadId);
        setLead(data);
        setEditData({
          firstName: data.firstName,
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          source: data.source,
          propertyType: data.propertyType || '',
          budget: data.budget || undefined,
          timeline: data.timeline || '',
          location: data.location || '',
          financingNeeded: data.financingNeeded || false,
          notes: data.notes || '',
          status: data.status,
        });
      } catch (error) {
        console.error('Failed to fetch lead:', error);
        toast.error('فشل في تحميل بيانات العميل المحتمل');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLead();
  }, [isOpen, leadId]);

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const data = await pipelinesApi.getAll();
        setPipelines(data);
        if (data.length > 0) {
          const defaultPipeline = data.find(p => p.isDefault) || data[0];
          setConvertData(prev => ({ ...prev, pipelineId: defaultPipeline.id }));
        }
      } catch (error) {
        console.error('Failed to fetch pipelines:', error);
      }
    };

    if (isConvertModalOpen) {
      fetchPipelines();
    }
  }, [isConvertModalOpen]);

  const handleDelete = async () => {
    if (!leadId) return;
    setIsDeleting(true);
    try {
      await leadsApi.delete(leadId);
      toast.success('تم حذف العميل المحتمل بنجاح');
      setIsDeleteModalOpen(false);
      onClose();
      onLeadUpdated();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('فشل في حذف العميل المحتمل');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async () => {
    if (!leadId) return;
    setIsUpdating(true);
    try {
      const updatedLead = await leadsApi.update(leadId, editData);
      setLead(updatedLead);
      setIsEditMode(false);
      toast.success('تم تحديث بيانات العميل المحتمل بنجاح');
      onLeadUpdated();
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast.error('فشل في تحديث بيانات العميل المحتمل');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!leadId) return;
    try {
      const updatedLead = await leadsApi.updateStatus(leadId, newStatus);
      setLead(updatedLead);
      toast.success('تم تحديث حالة العميل المحتمل');
      onLeadUpdated();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handleConvert = async () => {
    if (!leadId || !lead) return;
    setIsConverting(true);
    try {
      await leadsApi.convert(leadId, {
        ...convertData,
        dealTitle: convertData.dealTitle || `صفقة - ${lead.firstName} ${lead.lastName || ''}`.trim(),
      });
      toast.success('تم تحويل العميل المحتمل إلى جهة اتصال وصفقة');
      setIsConvertModalOpen(false);
      onClose();
      onLeadUpdated();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('فشل في تحويل العميل المحتمل');
    } finally {
      setIsConverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Side Panel */}
      <div className="fixed inset-y-0 end-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'تعديل العميل المحتمل' : 'تفاصيل العميل المحتمل'}
          </h2>
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
          ) : lead ? (
            <div className="p-6 space-y-6">
              {isEditMode ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="الاسم الأول"
                      value={editData.firstName || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                    <Input
                      label="اسم العائلة"
                      value={editData.lastName || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="البريد الإلكتروني"
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                      dir="ltr"
                    />
                    <Input
                      label="رقم الهاتف"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      dir="ltr"
                    />
                  </div>

                  <Input
                    label="رقم واتساب"
                    value={editData.whatsapp || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    dir="ltr"
                  />

                  <Select
                    label="الحالة"
                    value={editData.status || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="new">جديد</option>
                    <option value="contacted">تم التواصل</option>
                    <option value="qualified">مؤهل</option>
                    <option value="unqualified">غير مؤهل</option>
                  </Select>

                  <Select
                    label="نوع العقار"
                    value={editData.propertyType || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, propertyType: e.target.value }))}
                  >
                    <option value="">اختر نوع العقار</option>
                    <option value="villa">فيلا</option>
                    <option value="apartment">شقة</option>
                    <option value="land">أرض</option>
                    <option value="commercial">تجاري</option>
                    <option value="office">مكتب</option>
                    <option value="warehouse">مستودع</option>
                  </Select>

                  <Input
                    label="الميزانية (ر.س)"
                    type="number"
                    value={editData.budget || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, budget: e.target.value ? Number(e.target.value) : undefined }))}
                    dir="ltr"
                  />

                  <Input
                    label="الموقع المفضل"
                    value={editData.location || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex-1"
                    >
                      {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  {/* Lead Name & Status */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {sourceLabels[lead.source] || lead.source}
                        </p>
                      </div>
                      <Badge variant={statusColors[lead.status] || 'default'}>
                        {statusLabels[lead.status] || lead.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Score */}
                  {lead.score !== undefined && lead.score !== null && (
                    <div className="bg-primary-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-primary-600">تقييم العميل</span>
                        {lead.scoreGrade && (
                          <Badge variant={lead.scoreGrade === 'A' ? 'success' : lead.scoreGrade === 'B' ? 'warning' : 'default'}>
                            {lead.scoreGrade}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-primary-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-primary-700">{lead.score}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">معلومات التواصل</h4>

                    {lead.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">الهاتف</p>
                          <p className="font-medium ltr-nums" dir="ltr">{lead.phone}</p>
                        </div>
                      </div>
                    )}

                    {lead.whatsapp && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-500">واتساب</p>
                          <p className="font-medium ltr-nums" dir="ltr">{lead.whatsapp}</p>
                        </div>
                      </div>
                    )}

                    {lead.email && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                          <p className="font-medium">{lead.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Property Interest */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">الاهتمام العقاري</h4>

                    <div className="grid grid-cols-2 gap-3">
                      {lead.propertyType && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">نوع العقار</p>
                          <p className="font-medium">{propertyLabels[lead.propertyType] || lead.propertyType}</p>
                        </div>
                      )}

                      {lead.budget && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">الميزانية</p>
                          <p className="font-medium ltr-nums">{lead.budget.toLocaleString()} ر.س</p>
                        </div>
                      )}

                      {lead.location && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">الموقع</p>
                          <p className="font-medium">{lead.location}</p>
                        </div>
                      )}

                      {lead.timeline && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">الإطار الزمني</p>
                          <p className="font-medium">{timelineLabels[lead.timeline] || lead.timeline}</p>
                        </div>
                      )}
                    </div>

                    {lead.financingNeeded && (
                      <Badge variant="warning">يحتاج تمويل عقاري</Badge>
                    )}
                  </div>

                  {/* Notes */}
                  {lead.notes && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">ملاحظات</h4>
                      <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{lead.notes}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">العلامات</h4>
                      <div className="flex flex-wrap gap-2">
                        {lead.tags.map((tag) => (
                          <Badge key={tag} variant="primary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Change Buttons */}
                  {lead.status !== 'converted' && lead.status !== 'lost' && (
                    <div className="space-y-3 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-900">تغيير الحالة</p>
                      <div className="flex flex-wrap gap-2">
                        {lead.status !== 'contacted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('contacted')}
                          >
                            تم التواصل
                          </Button>
                        )}
                        {lead.status !== 'qualified' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('qualified')}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            مؤهل
                          </Button>
                        )}
                        {lead.status !== 'unqualified' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('unqualified')}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            غير مؤهل
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Convert Button */}
                  {lead.status === 'qualified' && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setIsConvertModalOpen(true)}
                    >
                      <ArrowRight className="h-4 w-4" />
                      تحويل إلى جهة اتصال وصفقة
                    </Button>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditMode(true)}
                    >
                      <Edit className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-error-500 border-error-200 hover:bg-error-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">العميل المحتمل غير موجود</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="حذف العميل المحتمل"
        message={`هل أنت متأكد من حذف "${lead?.firstName} ${lead?.lastName || ''}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Convert Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="تحويل العميل المحتمل"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            سيتم تحويل العميل المحتمل إلى جهة اتصال وإنشاء صفقة جديدة.
          </p>

          <Input
            label="عنوان الصفقة"
            value={convertData.dealTitle || ''}
            onChange={(e) => setConvertData(prev => ({ ...prev, dealTitle: e.target.value }))}
            placeholder={`صفقة - ${lead?.firstName} ${lead?.lastName || ''}`}
          />

          <Select
            label="مسار المبيعات"
            value={convertData.pipelineId || ''}
            onChange={(e) => setConvertData(prev => ({ ...prev, pipelineId: e.target.value }))}
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </Select>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setIsConvertModalOpen(false)}
              disabled={isConverting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConvert}
              disabled={isConverting || !convertData.pipelineId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConverting ? 'جاري التحويل...' : 'تحويل'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}
