import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { leadsApi, CreateLeadDto } from '@/services/leads.api';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLeadDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    source: 'manual',
    propertyType: '',
    budget: undefined,
    timeline: '',
    location: '',
    financingNeeded: false,
    notes: '',
    tags: [],
  });

  const handleChange = (field: keyof CreateLeadDto, value: string | number | boolean | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      setError('الاسم الأول مطلوب');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dataToSubmit: CreateLeadDto = {
        ...formData,
        propertyType: formData.propertyType || undefined,
        timeline: formData.timeline || undefined,
        budget: formData.budget ? Number(formData.budget) : undefined,
      };

      await leadsApi.create(dataToSubmit);
      onSuccess();
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        source: 'manual',
        propertyType: '',
        budget: undefined,
        timeline: '',
        location: '',
        financingNeeded: false,
        notes: '',
        tags: [],
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'حدث خطأ أثناء إضافة العميل المحتمل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة عميل محتمل جديد"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">المعلومات الأساسية</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الاسم الأول *"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="أدخل الاسم الأول"
              required
            />
            <Input
              label="اسم العائلة"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="أدخل اسم العائلة"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
            />
            <Input
              label="رقم الهاتف"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+966501234567"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="رقم واتساب"
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="+966501234567"
              dir="ltr"
            />
            <Select
              label="مصدر العميل"
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
            >
              <option value="manual">يدوي</option>
              <option value="whatsapp_bot">واتساب بوت</option>
              <option value="voice_bot">بوت صوتي</option>
              <option value="web_form">نموذج ويب</option>
              <option value="referral">إحالة</option>
              <option value="linkedin">لينكدإن</option>
              <option value="facebook">فيسبوك</option>
              <option value="google_ads">إعلانات جوجل</option>
            </Select>
          </div>
        </div>

        {/* Property Interest */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">الاهتمام العقاري</h3>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="نوع العقار"
              value={formData.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
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
              value={formData.budget || ''}
              onChange={(e) => handleChange('budget', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="1500000"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الموقع المفضل"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="مثال: شمال الرياض"
            />
            <Select
              label="الإطار الزمني"
              value={formData.timeline}
              onChange={(e) => handleChange('timeline', e.target.value)}
            >
              <option value="">اختر الإطار الزمني</option>
              <option value="immediate">فوري</option>
              <option value="1_month">خلال شهر</option>
              <option value="3_months">خلال 3 أشهر</option>
              <option value="6_months">خلال 6 أشهر</option>
              <option value="1_year">خلال سنة</option>
              <option value="undecided">غير محدد</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="financingNeeded"
              checked={formData.financingNeeded}
              onChange={(e) => handleChange('financingNeeded', e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="financingNeeded" className="text-sm text-gray-700">
              يحتاج تمويل عقاري
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">ملاحظات</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="أضف أي ملاحظات إضافية..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button type="submit" isLoading={isLoading}>
            إضافة العميل المحتمل
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateLeadModal;
