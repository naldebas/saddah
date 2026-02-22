import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui';
import { contactsApi, type CreateContactDto } from '@/services/contacts.api';
import { userApi, type User } from '@/services/user.api';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultCompanyId?: string;
}

const sources = [
  { value: 'manual', label: 'يدوي' },
  { value: 'whatsapp_bot', label: 'واتساب' },
  { value: 'voice_bot', label: 'بوت صوتي' },
  { value: 'web_form', label: 'نموذج ويب' },
  { value: 'referral', label: 'إحالة' },
  { value: 'linkedin', label: 'لينكدإن' },
];

export function CreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCompanyId,
}: CreateContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<CreateContactDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    title: '',
    source: 'manual',
    companyId: defaultCompanyId,
    ownerId: '',
  });

  useEffect(() => {
    if (isOpen) {
      userApi.getAll().then(setUsers).catch(console.error);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'الاسم الأول مطلوب';
    }
    if (!formData.lastName.trim()) {
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

    if (!validate()) return;

    setIsLoading(true);
    try {
      await contactsApi.create(formData);
      onSuccess();
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        title: '',
        source: 'manual',
        ownerId: '',
      });
    } catch (error: unknown) {
      console.error('Failed to create contact:', error);
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
      title="إضافة جهة اتصال جديدة"
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

        <div className="grid grid-cols-2 gap-4">
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

          <Select
            label="المسؤول"
            name="ownerId"
            value={formData.ownerId}
            onChange={handleChange}
          >
            <option value="">اختر المسؤول (اختياري)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </Select>
        </div>

        {errors.submit && (
          <p className="text-sm text-error-500">{errors.submit}</p>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isLoading}>
            إضافة جهة الاتصال
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
