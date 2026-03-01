import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Upload,
  Clock,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useSettings';
import type { BusinessHours, UpdateTenantSettingsDto } from '@/services/settings.api';

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'الأحد', labelEn: 'Sunday' },
  { id: 'monday', label: 'الإثنين', labelEn: 'Monday' },
  { id: 'tuesday', label: 'الثلاثاء', labelEn: 'Tuesday' },
  { id: 'wednesday', label: 'الأربعاء', labelEn: 'Wednesday' },
  { id: 'thursday', label: 'الخميس', labelEn: 'Thursday' },
  { id: 'friday', label: 'الجمعة', labelEn: 'Friday' },
  { id: 'saturday', label: 'السبت', labelEn: 'Saturday' },
];

const DEFAULT_COLORS = [
  '#0D9488', // Teal (default)
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
];

interface OrganizationSettingsProps {
  onSave?: () => void;
}

export function OrganizationSettings({ onSave }: OrganizationSettingsProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: tenantData, isLoading, error } = useTenantSettings();
  const updateSettings = useUpdateTenantSettings();

  // Local form state
  const [formData, setFormData] = useState<UpdateTenantSettingsDto>({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyWebsite: '',
    businessHours: {
      start: '09:00',
      end: '17:00',
      workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    },
    branding: {
      logo: '',
      primaryColor: '#0D9488',
      secondaryColor: '#F59E0B',
    },
  });

  // Sync form data when tenant data loads
  useEffect(() => {
    if (tenantData?.settings) {
      const settings = tenantData.settings;
      setFormData({
        companyName: settings.companyName || tenantData.name || '',
        companyEmail: settings.companyEmail || '',
        companyPhone: settings.companyPhone || '',
        companyAddress: settings.companyAddress || '',
        companyWebsite: settings.companyWebsite || '',
        businessHours: settings.businessHours || {
          start: '09:00',
          end: '17:00',
          workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        },
        branding: {
          logo: settings.branding?.logo || '',
          primaryColor: settings.branding?.primaryColor || '#0D9488',
          secondaryColor: settings.branding?.secondaryColor || '#F59E0B',
        },
      });
    }
  }, [tenantData]);

  const handleInputChange = (field: keyof UpdateTenantSettingsDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessHoursChange = (field: keyof BusinessHours, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours!,
        [field]: value,
      },
    }));
  };

  const toggleWorkDay = (dayId: string) => {
    const currentDays = formData.businessHours?.workDays || [];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter(d => d !== dayId)
      : [...currentDays, dayId];
    handleBusinessHoursChange('workDays', newDays);
  };

  const handleColorChange = (type: 'primaryColor' | 'secondaryColor', color: string) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [type]: color,
      },
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'يرجى اختيار ملف صورة' : 'Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف يجب أن يكون أقل من 2MB' : 'File size must be less than 2MB');
      return;
    }

    // For now, create a data URL (in production, this would upload to server)
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        branding: {
          ...prev.branding,
          logo: reader.result as string,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      onSave?.();
    } catch (error) {
      // Error is handled in the mutation hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">
          {isRTL ? 'فشل في تحميل الإعدادات' : 'Failed to load settings'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Company Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" />
          {isRTL ? 'معلومات الشركة' : 'Company Information'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={isRTL ? 'اسم الشركة' : 'Company Name'}
            value={formData.companyName || ''}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder={isRTL ? 'أدخل اسم الشركة' : 'Enter company name'}
            icon={<Building2 className="h-4 w-4" />}
          />
          <Input
            label={isRTL ? 'الموقع الإلكتروني' : 'Website'}
            value={formData.companyWebsite || ''}
            onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
            placeholder="https://example.com"
            icon={<Globe className="h-4 w-4" />}
          />
          <Input
            label={isRTL ? 'البريد الإلكتروني' : 'Email'}
            type="email"
            value={formData.companyEmail || ''}
            onChange={(e) => handleInputChange('companyEmail', e.target.value)}
            placeholder="info@company.com"
            icon={<Mail className="h-4 w-4" />}
          />
          <Input
            label={isRTL ? 'رقم الهاتف' : 'Phone'}
            type="tel"
            value={formData.companyPhone || ''}
            onChange={(e) => handleInputChange('companyPhone', e.target.value)}
            placeholder="+966 50 123 4567"
            icon={<Phone className="h-4 w-4" />}
          />
          <div className="md:col-span-2">
            <Input
              label={isRTL ? 'العنوان' : 'Address'}
              value={formData.companyAddress || ''}
              onChange={(e) => handleInputChange('companyAddress', e.target.value)}
              placeholder={isRTL ? 'أدخل عنوان الشركة' : 'Enter company address'}
              icon={<MapPin className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      {/* Branding */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isRTL ? 'الهوية البصرية' : 'Branding'}
        </h3>
        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'شعار الشركة' : 'Company Logo'}
            </label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {formData.branding?.logo ? (
                  <img
                    src={formData.branding.logo}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 me-2" />
                  {isRTL ? 'رفع شعار' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  {isRTL ? 'PNG أو JPG. الحد الأقصى 2MB' : 'PNG or JPG. Max 2MB'}
                </p>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'اللون الرئيسي' : 'Primary Color'}
              </label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange('primaryColor', color)}
                    className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.branding?.primaryColor === color
                        ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'اللون الثانوي' : 'Secondary Color'}
              </label>
              <div className="flex gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange('secondaryColor', color)}
                    className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.branding?.secondaryColor === color
                        ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          {isRTL ? 'ساعات العمل' : 'Business Hours'}
        </h3>
        <div className="space-y-4">
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'وقت البداية' : 'Start Time'}
              </label>
              <input
                type="time"
                value={formData.businessHours?.start || '09:00'}
                onChange={(e) => handleBusinessHoursChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'وقت النهاية' : 'End Time'}
              </label>
              <input
                type="time"
                value={formData.businessHours?.end || '17:00'}
                onChange={(e) => handleBusinessHoursChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Work Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'أيام العمل' : 'Work Days'}
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.businessHours?.workDays?.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => toggleWorkDay(day.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isRTL ? day.label : day.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Plan Info (Read Only) */}
      {tenantData && (
        <section className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {isRTL ? 'خطة الاشتراك' : 'Subscription Plan'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium capitalize">
              {tenantData.plan}
            </span>
            <span className="text-sm text-gray-500">
              {isRTL ? 'منذ' : 'Since'} {new Date(tenantData.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        </section>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {isRTL ? 'جاري الحفظ...' : 'Saving...'}
            </>
          ) : (
            isRTL ? 'حفظ التغييرات' : 'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
