import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X,
  User,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Badge,
  Avatar,
  Spinner,
  ConfirmModal,
} from '@/components/ui';
import { dealsApi, type Deal } from '@/services/deals.api';
import { EditDealModal } from './EditDealModal';

interface DealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string | null;
  onDealUpdated: () => void;
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  open: { label: 'مفتوحة', variant: 'warning' },
  won: { label: 'تم الفوز', variant: 'success' },
  lost: { label: 'خسارة', variant: 'error' },
};

export function DealDetailModal({
  isOpen,
  onClose,
  dealId,
  onDealUpdated,
}: DealDetailModalProps) {
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen || !dealId) return;

    const fetchDeal = async () => {
      setIsLoading(true);
      try {
        const data = await dealsApi.getById(dealId);
        setDeal(data);
      } catch (error) {
        console.error('Failed to fetch deal:', error);
        toast.error('فشل في تحميل بيانات الصفقة');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeal();
  }, [isOpen, dealId]);

  const handleDelete = async () => {
    if (!dealId) return;
    setIsDeleting(true);
    try {
      await dealsApi.delete(dealId);
      toast.success('تم حذف الصفقة بنجاح');
      setIsDeleteModalOpen(false);
      onClose();
      onDealUpdated();
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('فشل في حذف الصفقة');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeal = async (status: 'won' | 'lost') => {
    if (!dealId) return;
    setIsClosing(true);
    try {
      await dealsApi.close(dealId, { status });
      toast.success(status === 'won' ? 'تم تسجيل الفوز بالصفقة' : 'تم تسجيل خسارة الصفقة');
      onClose();
      onDealUpdated();
    } catch (error) {
      console.error('Failed to close deal:', error);
      toast.error('فشل في إغلاق الصفقة');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenDeal = async () => {
    if (!dealId) return;
    setIsClosing(true);
    try {
      await dealsApi.reopen(dealId);
      toast.success('تم إعادة فتح الصفقة');
      onClose();
      onDealUpdated();
    } catch (error) {
      console.error('Failed to reopen deal:', error);
      toast.error('فشل في إعادة فتح الصفقة');
    } finally {
      setIsClosing(false);
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
          <h2 className="text-lg font-semibold text-gray-900">تفاصيل الصفقة</h2>
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
          ) : deal ? (
            <div className="p-6 space-y-6">
              {/* Deal Title & Status */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{deal.title}</h3>
                    {deal.stage && (
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: deal.stage.color }}
                        />
                        <span className="text-gray-600">{deal.stage.name}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={statusLabels[deal.status]?.variant || 'default'}>
                    {statusLabels[deal.status]?.label || deal.status}
                  </Badge>
                </div>
              </div>

              {/* Value */}
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-primary-600 mb-1">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm">قيمة الصفقة</span>
                </div>
                <p className="text-2xl font-bold text-primary-700 ltr-nums">
                  {Number(deal.value).toLocaleString('ar-SA')} {deal.currency}
                </p>
              </div>

              {/* Contact & Company */}
              <div className="space-y-4">
                {deal.contact && (
                  <div
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      onClose();
                      navigate(`/contacts/${deal.contact!.id}`);
                    }}
                  >
                    <Avatar
                      name={`${deal.contact.firstName} ${deal.contact.lastName}`}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm text-gray-500">جهة الاتصال</p>
                      <p className="font-medium text-gray-900">
                        {deal.contact.firstName} {deal.contact.lastName}
                      </p>
                    </div>
                  </div>
                )}

                {deal.company && (
                  <div
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      onClose();
                      navigate(`/companies/${deal.company!.id}`);
                    }}
                  >
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الشركة</p>
                      <p className="font-medium text-gray-900">{deal.company.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                {deal.owner && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">المسؤول:</span>
                    <span className="text-sm text-gray-900">
                      {deal.owner.firstName} {deal.owner.lastName}
                    </span>
                  </div>
                )}

                {deal.expectedCloseDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">تاريخ الإغلاق المتوقع:</span>
                    <span className="text-sm text-gray-900 ltr-nums">
                      {new Date(deal.expectedCloseDate).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}

                {deal.pipeline && (
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">مسار المبيعات:</span>
                    <span className="text-sm text-gray-900">{deal.pipeline.name}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {deal.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">العلامات</p>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag) => (
                      <Badge key={tag} variant="primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {deal.status === 'open' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-success-600 border-success-200 hover:bg-success-50"
                      onClick={() => handleCloseDeal('won')}
                      disabled={isClosing}
                    >
                      <CheckCircle className="h-4 w-4" />
                      تم الفوز
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-error-600 border-error-200 hover:bg-error-50"
                      onClick={() => handleCloseDeal('lost')}
                      disabled={isClosing}
                    >
                      <XCircle className="h-4 w-4" />
                      خسارة
                    </Button>
                  </div>
                )}

                {deal.status !== 'open' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReopenDeal}
                    disabled={isClosing}
                  >
                    <RotateCcw className="h-4 w-4" />
                    إعادة فتح الصفقة
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditModalOpen(true)}
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
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">الصفقة غير موجودة</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="حذف الصفقة"
        message={`هل أنت متأكد من حذف "${deal?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Edit Modal */}
      <EditDealModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          onDealUpdated();
          // Refetch deal to show updated data
          if (dealId) {
            dealsApi.getById(dealId).then(setDeal).catch(console.error);
          }
        }}
        deal={deal}
      />
    </>
  );
}
