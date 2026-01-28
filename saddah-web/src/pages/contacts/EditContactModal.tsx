import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui';
import { contactsApi, type Contact, type UpdateContactDto } from '@/services/contacts.api';

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContact: Contact) => void;
  contact: Contact | null;
}

const sources = [
  { value: 'manual', label: 'يدوي' },
  { value: 'whatsapp_bot', label: 'واتساب' },
  { value: 'voice_bot', label: 'بوت صوتي' },
  { value: 'web_form', label: 'نموذج ويب' },
  { value: 'referral', label: 'إحالة' },
  { value: 'linkedin', label: 'لينكدإن' },
];

export function EditContactModal({
  isOpen,
  onClose,
  onSuccess,
  contact,
}: EditContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<UpdateContactDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    title: '',
    source: 'manual',
  });

  useEffect(() => {
    if (contact && isOpen) {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        phone: contact.phone || '',
        whatsapp: contact.whatsapp || '',
        title: contact.title || '',
        source: contact.source,
      });
      setErrors({});
    }
  }, [contact, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'الاسم الأول مطلوب';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'اسم العائلة مطلوب';
    }
    if (!formData.phone && !formData.email) {
      newErrors.phone = 'يجب إدخال رقم الهاتف أو البريد الإلكتروني';
      newErrors.email = 'يجب إدخال رقم الهاتف أو البريد الإلكتروني';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !contact) return;

    setIsLoading(true);
    try {
      const updatedContact = await contactsApi.update(contact.id, formData);
      onSuccess(updatedContact);
    } catch (error: unknown) {
      console.error('Failed to update contact:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      if (apiError.response?.data?.message) {
        setErrors({ submit: apiError.response.data.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل جهة الاتصال"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="الاسم الأول"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <Input
            label="اسم العائلة"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          label="البريد الإلكتروني"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          dir="ltr"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="رقم الهاتف"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="+966..."
            dir="ltr"
          />
          <Input
            label="واتساب"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
            placeholder="+966..."
            dir="ltr"
          />
        </div>

        <Input
          label="المسمى الوظيفي"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />

        <Select
          label="المصدر"
          name="source"
          value={formData.source}
          onChange={handleChange}
        >
          {sources.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </Select>

        {errors.submit && (
          <p className="text-sm text-error-500">{errors.submit}</p>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isLoading}>
            حفظ التغييرات
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
