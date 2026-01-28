import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { activitiesApi, CreateActivityDto } from '@/services/activities.api';
import { contactsApi, Contact } from '@/services/contacts.api';
import { dealsApi, Deal } from '@/services/deals.api';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactId?: string;
  dealId?: string;
}

export function CreateActivityModal({
  isOpen,
  onClose,
  onSuccess,
  contactId: initialContactId,
  dealId: initialDealId,
}: CreateActivityModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [formData, setFormData] = useState<CreateActivityDto>({
    type: 'call',
    subject: '',
    description: '',
    dueDate: '',
    contactId: initialContactId,
    dealId: initialDealId,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsResponse, dealsResponse] = await Promise.all([
          contactsApi.getAll({ limit: 100 }),
          dealsApi.getAll({ limit: 100, status: 'open' }),
        ]);
        setContacts(contactsResponse.data);
        setDeals(dealsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      contactId: initialContactId,
      dealId: initialDealId,
    }));
  }, [initialContactId, initialDealId]);

  const handleChange = (field: keyof CreateActivityDto, value: string | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      setError('الموضوع مطلوب');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dataToSubmit: CreateActivityDto = {
        ...formData,
        contactId: formData.contactId || undefined,
        dealId: formData.dealId || undefined,
        dueDate: formData.dueDate || undefined,
      };

      await activitiesApi.create(dataToSubmit);
      onSuccess();
      // Reset form
      setFormData({
        type: 'call',
        subject: '',
        description: '',
        dueDate: '',
        contactId: initialContactId,
        dealId: initialDealId,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'حدث خطأ أثناء إضافة النشاط');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة نشاط جديد"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Select
          label="نوع النشاط *"
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value as CreateActivityDto['type'])}
        >
          <option value="call">مكالمة</option>
          <option value="meeting">اجتماع</option>
          <option value="email">بريد إلكتروني</option>
          <option value="task">مهمة</option>
          <option value="note">ملاحظة</option>
          <option value="whatsapp">واتساب</option>
          <option value="site_visit">زيارة موقع</option>
        </Select>

        <Input
          label="الموضوع *"
          value={formData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="أدخل موضوع النشاط"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            الوصف
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="أضف وصفاً للنشاط..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <Input
          label="تاريخ الاستحقاق"
          type="datetime-local"
          value={formData.dueDate}
          onChange={(e) => handleChange('dueDate', e.target.value)}
        />

        {!initialContactId && (
          <Select
            label="جهة الاتصال"
            value={formData.contactId || ''}
            onChange={(e) => handleChange('contactId', e.target.value || undefined)}
          >
            <option value="">اختر جهة اتصال</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </Select>
        )}

        {!initialDealId && (
          <Select
            label="الصفقة"
            value={formData.dealId || ''}
            onChange={(e) => handleChange('dealId', e.target.value || undefined)}
          >
            <option value="">اختر صفقة</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title} - {Number(deal.value).toLocaleString('ar-SA')} {deal.currency}
              </option>
            ))}
          </Select>
        )}

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
            إضافة النشاط
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateActivityModal;
