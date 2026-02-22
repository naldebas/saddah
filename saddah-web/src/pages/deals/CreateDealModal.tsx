import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from '@/components/ui';
import { dealsApi, pipelinesApi, type CreateDealDto, type Pipeline } from '@/services/deals.api';
import { contactsApi, type Contact } from '@/services/contacts.api';
import { companiesApi, type Company } from '@/services/companies.api';
import { userApi, type User } from '@/services/user.api';

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPipelineId?: string;
  defaultStageId?: string;
  defaultContactId?: string;
  defaultCompanyId?: string;
}

export function CreateDealModal({
  isOpen,
  onClose,
  onSuccess,
  defaultPipelineId,
  defaultStageId,
  defaultContactId,
  defaultCompanyId,
}: CreateDealModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<CreateDealDto>({
    title: '',
    value: 0,
    currency: 'SAR',
    pipelineId: defaultPipelineId || '',
    stageId: defaultStageId || '',
    contactId: defaultContactId || '',
    companyId: defaultCompanyId || '',
    expectedCloseDate: '',
    ownerId: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pipelinesData, contactsData, companiesData, usersData] = await Promise.all([
          pipelinesApi.getAll(),
          contactsApi.getAll({ limit: 100 }),
          companiesApi.getAll({ limit: 100 }),
          userApi.getAll(),
        ]);
        setPipelines(pipelinesData);
        setContacts(contactsData.data);
        setCompanies(companiesData.data);
        setUsers(usersData);

        // Set default pipeline and stage
        if (defaultPipelineId) {
          setFormData(prev => ({ ...prev, pipelineId: defaultPipelineId }));
          if (defaultStageId) {
            setFormData(prev => ({ ...prev, stageId: defaultStageId }));
          }
        } else if (pipelinesData.length > 0) {
          const defaultPipeline = pipelinesData.find(p => p.isDefault) || pipelinesData[0];
          setFormData(prev => ({
            ...prev,
            pipelineId: defaultPipeline.id,
            stageId: defaultPipeline.stages?.[0]?.id || '',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    if (isOpen) {
      fetchData();
      // Set default contact/company if provided
      if (defaultContactId) {
        setFormData(prev => ({ ...prev, contactId: defaultContactId }));
      }
      if (defaultCompanyId) {
        setFormData(prev => ({ ...prev, companyId: defaultCompanyId }));
      }
    }
  }, [isOpen, defaultPipelineId, defaultStageId, defaultContactId, defaultCompanyId]);

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

  const handleContactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contactId = e.target.value;
    const contact = contacts.find(c => c.id === contactId);

    // Auto-populate company if contact has one
    setFormData(prev => ({
      ...prev,
      contactId,
      ...(contact?.companyId && { companyId: contact.companyId }),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'عنوان الصفقة مطلوب';
    }
    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'قيمة الصفقة مطلوبة';
    }
    if (!formData.pipelineId) {
      newErrors.pipelineId = 'مسار المبيعات مطلوب';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'المرحلة مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        value: Number(formData.value),
        contactId: formData.contactId || undefined,
        companyId: formData.companyId || undefined,
        expectedCloseDate: formData.expectedCloseDate || undefined,
      };
      await dealsApi.create(dataToSubmit);
      onSuccess();
      // Reset form
      setFormData({
        title: '',
        value: 0,
        currency: 'SAR',
        pipelineId: defaultPipelineId || '',
        stageId: defaultStageId || '',
        contactId: defaultContactId || '',
        companyId: defaultCompanyId || '',
        expectedCloseDate: '',
        ownerId: '',
      });
    } catch (error: unknown) {
      console.error('Failed to create deal:', error);
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
      title="إضافة صفقة جديدة"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="عنوان الصفقة"
          name="title"
          value={formData.title}
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
            value={formData.value}
            onChange={handleChange}
            error={errors.value}
            required
            min={0}
            dir="ltr"
          />
          <Select
            label="العملة"
            name="currency"
            value={formData.currency}
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
            value={formData.pipelineId}
            onChange={handlePipelineChange}
            error={errors.pipelineId}
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
            value={formData.stageId}
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
            value={formData.contactId}
            onChange={handleContactChange}
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
            value={formData.companyId}
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

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="تاريخ الإغلاق المتوقع"
            name="expectedCloseDate"
            type="date"
            value={formData.expectedCloseDate}
            onChange={handleChange}
            dir="ltr"
          />

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
            إضافة الصفقة
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
