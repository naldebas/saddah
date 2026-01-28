import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui';
import { dealsApi, pipelinesApi, type Deal, type UpdateDealDto, type Pipeline } from '@/services/deals.api';
import { contactsApi, type Contact } from '@/services/contacts.api';
import { companiesApi, type Company } from '@/services/companies.api';

interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

interface EditDealFormData {
  title: string;
  value: number;
  currency: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  companyId: string;
  expectedCloseDate: string;
}

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deal: Deal | null;
}

export function EditDealModal({
  isOpen,
  onClose,
  onSuccess,
  deal,
}: EditDealModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<EditDealFormData>({
    title: '',
    value: 0,
    currency: 'SAR',
    pipelineId: '',
    stageId: '',
    contactId: '',
    companyId: '',
    expectedCloseDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pipelinesData, contactsData, companiesData] = await Promise.all([
          pipelinesApi.getAll(),
          contactsApi.getAll({ limit: 100 }),
          companiesApi.getAll({ limit: 100 }),
        ]);
        setPipelines(pipelinesData);
        setContacts(contactsData.data);
        setCompanies(companiesData.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        value: Number(deal.value),
        currency: deal.currency,
        pipelineId: deal.pipeline?.id || '',
        stageId: deal.stage?.id || '',
        contactId: deal.contact?.id || '',
        companyId: deal.company?.id || '',
        expectedCloseDate: deal.expectedCloseDate
          ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [deal]);

  const selectedPipeline = pipelines.find(p => p.id === formData.pipelineId);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePipelineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pipelineId = e.target.value;
    const pipeline = pipelines.find(p => p.id === pipelineId);
    setFormData(prev => ({
      ...prev,
      pipelineId,
      stageId: pipeline?.stages?.[0]?.id || '',
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'عنوان الصفقة مطلوب';
    }
    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'قيمة الصفقة مطلوبة';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'المرحلة مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !deal) return;

    setIsLoading(true);
    try {
      const dataToSubmit: UpdateDealDto = {
        title: formData.title,
        value: Number(formData.value),
        currency: formData.currency,
        stageId: formData.stageId,
        contactId: formData.contactId || undefined,
        companyId: formData.companyId || undefined,
        expectedCloseDate: formData.expectedCloseDate || undefined,
      };
      await dealsApi.update(deal.id, dataToSubmit);
      toast.success('تم تحديث الصفقة بنجاح');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update deal:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.data?.message) {
        setErrors({ submit: axiosError.response.data.message });
      } else {
        toast.error('فشل في تحديث الصفقة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!deal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل الصفقة"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="عنوان الصفقة"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          error={errors.title}
          required
          placeholder="مثال: بيع فيلا في الرياض"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="قيمة الصفقة"
            name="value"
            type="number"
            value={formData.value || 0}
            onChange={handleChange}
            error={errors.value}
            required
            min={0}
            dir="ltr"
          />
          <Select
            label="العملة"
            name="currency"
            value={formData.currency || 'SAR'}
            onChange={handleChange}
          >
            <option value="SAR">ريال سعودي</option>
            <option value="USD">دولار أمريكي</option>
            <option value="AED">درهم إماراتي</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="مسار المبيعات"
            name="pipelineId"
            value={formData.pipelineId || ''}
            onChange={handlePipelineChange}
            disabled
          >
            <option value="">اختر المسار</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </Select>

          <Select
            label="المرحلة"
            name="stageId"
            value={formData.stageId || ''}
            onChange={handleChange}
            error={errors.stageId}
          >
            <option value="">اختر المرحلة</option>
            {selectedPipeline?.stages?.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="جهة الاتصال"
            name="contactId"
            value={formData.contactId || ''}
            onChange={handleChange}
          >
            <option value="">اختر جهة الاتصال</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </Select>

          <Select
            label="الشركة"
            name="companyId"
            value={formData.companyId || ''}
            onChange={handleChange}
          >
            <option value="">اختر الشركة</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="تاريخ الإغلاق المتوقع"
          name="expectedCloseDate"
          type="date"
          value={formData.expectedCloseDate || ''}
          onChange={handleChange}
          dir="ltr"
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
