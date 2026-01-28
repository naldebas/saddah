import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui';
import { companiesApi, type Company, type UpdateCompanyDto } from '@/services/companies.api';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCompany: Company) => void;
  company: Company | null;
}

const industries = [
  { value: 'تطوير عقاري', label: 'تطوير عقاري' },
  { value: 'وساطة عقارية', label: 'وساطة عقارية' },
  { value: 'استثمار عقاري', label: 'استثمار عقاري' },
  { value: 'مقاولات', label: 'مقاولات' },
  { value: 'إدارة أملاك', label: 'إدارة أملاك' },
  { value: 'تصميم داخلي', label: 'تصميم داخلي' },
  { value: 'أخرى', label: 'أخرى' },
];

const sizes = [
  { value: 'small', label: 'صغيرة (1-50 موظف)' },
  { value: 'medium', label: 'متوسطة (51-200 موظف)' },
  { value: 'large', label: 'كبيرة (201-1000 موظف)' },
  { value: 'enterprise', label: 'عملاقة (+1000 موظف)' },
];

const cities = [
  { value: 'الرياض', label: 'الرياض' },
  { value: 'جدة', label: 'جدة' },
  { value: 'الدمام', label: 'الدمام' },
  { value: 'مكة المكرمة', label: 'مكة المكرمة' },
  { value: 'المدينة المنورة', label: 'المدينة المنورة' },
  { value: 'الخبر', label: 'الخبر' },
  { value: 'الظهران', label: 'الظهران' },
  { value: 'تبوك', label: 'تبوك' },
  { value: 'أبها', label: 'أبها' },
  { value: 'القصيم', label: 'القصيم' },
];

export function EditCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  company,
}: EditCompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<UpdateCompanyDto>({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    size: '',
  });

  useEffect(() => {
    if (company && isOpen) {
      setFormData({
        name: company.name,
        industry: company.industry || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        city: company.city || '',
        size: company.size || '',
      });
      setErrors({});
    }
  }, [company, isOpen]);

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

    if (!formData.name?.trim()) {
      newErrors.name = 'اسم الشركة مطلوب';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !company) return;

    // Auto-prepend https:// to website if needed
    const dataToSubmit = {
      ...formData,
      website: formData.website && !formData.website.startsWith('http')
        ? `https://${formData.website}`
        : formData.website,
    };

    setIsLoading(true);
    try {
      const updatedCompany = await companiesApi.update(company.id, dataToSubmit);
      onSuccess(updatedCompany);
    } catch (error: unknown) {
      console.error('Failed to update company:', error);
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
      title="تعديل الشركة"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="اسم الشركة"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="القطاع"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
          >
            <option value="">اختر القطاع</option>
            {industries.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </Select>

          <Select
            label="حجم الشركة"
            name="size"
            value={formData.size}
            onChange={handleChange}
          >
            <option value="">اختر الحجم</option>
            {sizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="الموقع الإلكتروني"
          name="website"
          value={formData.website}
          onChange={handleChange}
          error={errors.website}
          placeholder="https://example.com"
          dir="ltr"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="رقم الهاتف"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+966..."
            dir="ltr"
          />
          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            dir="ltr"
          />
        </div>

        <Select
          label="المدينة"
          name="city"
          value={formData.city}
          onChange={handleChange}
        >
          <option value="">اختر المدينة</option>
          {cities.map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </Select>

        <Input
          label="العنوان"
          name="address"
          value={formData.address}
          onChange={handleChange}
        />

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
