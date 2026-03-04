import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Globe,
  Lock,
  Palette,
  Users,
  Save,
  Check,
  UserPlus,
  Loader2,
  Edit2,
  Building2,
  MessageCircle,
  Upload,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { userApi, User as UserType } from '@/services/user.api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { OrganizationSettings } from './OrganizationSettings';
import { WhatsAppSettings } from './WhatsAppSettings';
import { BotpressSettings } from './BotpressSettings';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUserPreferences,
  useUpdateUserPreferences,
} from '@/hooks/useSettings';

type SettingsTab = 'profile' | 'organization' | 'notifications' | 'language' | 'security' | 'appearance' | 'integrations' | 'team';

interface TabItem {
  id: SettingsTab;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isAdmin = user?.role === 'admin';
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Team state
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // Notification preferences from backend
  const { data: notificationPrefs, isLoading: loadingNotifications } = useNotificationPreferences();
  const updateNotificationPrefs = useUpdateNotificationPreferences();

  // User preferences from backend
  const { data: userPrefs, isLoading: loadingPreferences } = useUserPreferences();
  const updateUserPrefs = useUpdateUserPreferences();

  // Local state for appearance
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [selectedColor, setSelectedColor] = useState('#0D9488');

  // Sync preferences when loaded
  useEffect(() => {
    if (userPrefs) {
      setSelectedTheme(userPrefs.theme);
      setSelectedColor(userPrefs.accentColor);
    }
  }, [userPrefs]);

  // Fetch team members when tab is active
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const users = await userApi.getAll();
      setTeamMembers(users);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error(isRTL ? 'فشل في تحميل أعضاء الفريق' : 'Failed to load team members');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleEditUser = (member: UserType) => {
    setSelectedUser(member);
    setEditUserModalOpen(true);
  };

  const roleLabels: Record<string, string> = {
    admin: isRTL ? 'مدير النظام' : 'Admin',
    sales_manager: isRTL ? 'مدير المبيعات' : 'Sales Manager',
    sales_rep: isRTL ? 'مندوب مبيعات' : 'Sales Rep',
  };

  const tabs: TabItem[] = [
    { id: 'profile', label: 'الملف الشخصي', labelEn: 'Profile', icon: <User className="h-5 w-5" /> },
    { id: 'organization', label: 'المنظمة', labelEn: 'Organization', icon: <Building2 className="h-5 w-5" />, adminOnly: true },
    { id: 'notifications', label: 'الإشعارات', labelEn: 'Notifications', icon: <Bell className="h-5 w-5" /> },
    { id: 'language', label: 'اللغة', labelEn: 'Language', icon: <Globe className="h-5 w-5" /> },
    { id: 'security', label: 'الأمان', labelEn: 'Security', icon: <Lock className="h-5 w-5" /> },
    { id: 'appearance', label: 'المظهر', labelEn: 'Appearance', icon: <Palette className="h-5 w-5" /> },
    { id: 'integrations', label: 'التكاملات', labelEn: 'Integrations', icon: <MessageCircle className="h-5 w-5" />, adminOnly: true },
    { id: 'team', label: 'الفريق', labelEn: 'Team', icon: <Users className="h-5 w-5" />, adminOnly: true },
  ];

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'profile') {
        const updatedUser = await userApi.updateProfile(profileData);
        setUser(updatedUser);
        toast.success(isRTL ? 'تم حفظ الملف الشخصي بنجاح' : 'Profile saved successfully');
      } else if (activeTab === 'security') {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast.error(isRTL ? 'كلمة المرور الجديدة غير متطابقة' : 'New passwords do not match');
          setSaving(false);
          return;
        }
        await userApi.changePassword(passwordData);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(isRTL ? 'فشل في حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Also persist to backend
    updateUserPrefs.mutate({ language: lang });
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    updateNotificationPrefs.mutate({ [key]: value });
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    updateUserPrefs.mutate({ theme });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    updateUserPrefs.mutate({ accentColor: color });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingAvatar(true);
    try {
      const result = await userApi.uploadAvatar(file);
      // Update user in auth store with new avatar
      if (user) {
        setUser({ ...user, avatar: result.url });
      }
      toast.success(isRTL ? 'تم تحديث الصورة الشخصية' : 'Avatar updated successfully');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error(isRTL ? 'فشل في تحميل الصورة' : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isRTL ? 'معلومات الملف الشخصي' : 'Profile Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isRTL ? 'الاسم الأول' : 'First Name'}
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={isRTL ? 'أدخل الاسم الأول' : 'Enter first name'}
                />
                <Input
                  label={isRTL ? 'الاسم الأخير' : 'Last Name'}
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={isRTL ? 'أدخل الاسم الأخير' : 'Enter last name'}
                />
                <Input
                  label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                  type="email"
                  value={user?.email || ''}
                  disabled
                  placeholder={isRTL ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                />
                <Input
                  label={isRTL ? 'رقم الجوال' : 'Phone'}
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={isRTL ? 'أدخل رقم الجوال' : 'Enter phone number'}
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isRTL ? 'الصورة الشخصية' : 'Profile Picture'}
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary-600">
                      {user?.firstName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 me-2" />
                    )}
                    {isRTL ? 'تغيير الصورة' : 'Change Picture'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'JPG أو PNG. الحد الأقصى 2MB' : 'JPG or PNG. Max 2MB'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'organization':
        return <OrganizationSettings />;

      case 'notifications':
        if (loadingNotifications) {
          return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
            </h3>
            <div className="space-y-4">
              {[
                { id: 'emailNotifications', label: isRTL ? 'إشعارات البريد الإلكتروني' : 'Email Notifications', desc: isRTL ? 'استلام إشعارات عبر البريد' : 'Receive notifications via email' },
                { id: 'pushNotifications', label: isRTL ? 'الإشعارات الفورية' : 'Push Notifications', desc: isRTL ? 'إشعارات المتصفح الفورية' : 'Real-time browser notifications' },
                { id: 'dealUpdates', label: isRTL ? 'تحديثات الصفقات' : 'Deal Updates', desc: isRTL ? 'إشعار عند تغيير حالة الصفقات' : 'Notify when deal status changes' },
                { id: 'newLeads', label: isRTL ? 'العملاء المحتملين الجدد' : 'New Leads', desc: isRTL ? 'إشعار عند إضافة عميل جديد' : 'Notify when new lead is added' },
                { id: 'activityReminders', label: isRTL ? 'تذكير الأنشطة' : 'Activity Reminders', desc: isRTL ? 'تذكير قبل موعد النشاط' : 'Remind before activity is due' },
                { id: 'dailyDigest', label: isRTL ? 'الملخص اليومي' : 'Daily Digest', desc: isRTL ? 'ملخص يومي للأنشطة' : 'Daily summary of activities' },
                { id: 'weeklyReport', label: isRTL ? 'التقرير الأسبوعي' : 'Weekly Report', desc: isRTL ? 'تقرير أسبوعي بالأداء' : 'Weekly performance report' },
                { id: 'conversationAssignments', label: isRTL ? 'تعيين المحادثات' : 'Conversation Assignments', desc: isRTL ? 'إشعار عند تعيين محادثة' : 'Notify when conversation is assigned' },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs?.[item.id as keyof typeof notificationPrefs] ?? true}
                      onChange={(e) => handleNotificationToggle(item.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إعدادات اللغة' : 'Language Settings'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleLanguageChange('ar')}
                className={`p-4 rounded-lg border-2 text-start transition-colors ${
                  i18n.language === 'ar'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇸🇦</span>
                  <div>
                    <p className="font-semibold text-gray-900">العربية</p>
                    <p className="text-sm text-gray-500">اللغة العربية</p>
                  </div>
                  {i18n.language === 'ar' && (
                    <Check className="h-5 w-5 text-primary-500 ms-auto" />
                  )}
                </div>
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`p-4 rounded-lg border-2 text-start transition-colors ${
                  i18n.language === 'en'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <p className="font-semibold text-gray-900">English</p>
                    <p className="text-sm text-gray-500">English Language</p>
                  </div>
                  {i18n.language === 'en' && (
                    <Check className="h-5 w-5 text-primary-500 ms-auto" />
                  )}
                </div>
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إعدادات الأمان' : 'Security Settings'}
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">
                  {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                </h4>
                <div className="space-y-4">
                  <Input
                    label={isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder={isRTL ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                  />
                  <Input
                    label={isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  />
                  <Input
                    label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder={isRTL ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {isRTL ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isRTL ? 'أضف طبقة حماية إضافية لحسابك' : 'Add an extra layer of security to your account'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {isRTL ? 'تفعيل' : 'Enable'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        if (loadingPreferences) {
          return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isRTL ? 'إعدادات المظهر' : 'Appearance Settings'}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-3">{isRTL ? 'السمة' : 'Theme'}</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light' as const, label: isRTL ? 'فاتح' : 'Light', icon: '☀️' },
                    { id: 'dark' as const, label: isRTL ? 'داكن' : 'Dark', icon: '🌙' },
                    { id: 'system' as const, label: isRTL ? 'النظام' : 'System', icon: '💻' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        selectedTheme === theme.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{theme.icon}</span>
                      <p className="text-sm font-medium text-gray-900 mt-2">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-3">{isRTL ? 'اللون الرئيسي' : 'Accent Color'}</p>
                <div className="flex gap-3">
                  {['#0D9488', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                        selectedColor === color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-10">
            <WhatsAppSettings />
            <div className="border-t border-gray-200 pt-10">
              <BotpressSettings />
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {isRTL ? 'أعضاء الفريق' : 'Team Members'}
              </h3>
              <Button size="sm" onClick={() => setCreateUserModalOpen(true)}>
                <UserPlus className="h-4 w-4 me-2" />
                {isRTL ? 'إضافة عضو' : 'Add Member'}
              </Button>
            </div>
            {loadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{isRTL ? 'لا يوجد أعضاء في الفريق' : 'No team members'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleEditUser(member)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span className="font-semibold text-primary-600">
                            {member.firstName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {roleLabels[member.role] || member.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.isActive !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.isActive !== false ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                      </span>
                      <button
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(member);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <CreateUserModal
              isOpen={createUserModalOpen}
              onClose={() => setCreateUserModalOpen(false)}
              onSuccess={fetchTeamMembers}
            />
            <EditUserModal
              isOpen={editUserModalOpen}
              user={selectedUser}
              onClose={() => {
                setEditUserModalOpen(false);
                setSelectedUser(null);
              }}
              onSuccess={fetchTeamMembers}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Determine if save button should be shown for current tab
  const showSaveButton = ['profile', 'security'].includes(activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.settings')}</h1>
          <p className="text-gray-500 mt-1">
            {isRTL ? 'إدارة إعدادات حسابك والتفضيلات' : 'Manage your account settings and preferences'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <Card className="lg:w-64 flex-shrink-0">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span>{isRTL ? tab.label : tab.labelEn}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Main content */}
        <Card className="flex-1">
          <CardContent>
            {renderContent()}
            {showSaveButton && (
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <Button variant="outline">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                      {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : saved ? (
                    <>
                      <Check className="h-4 w-4 me-2" />
                      {isRTL ? 'تم الحفظ' : 'Saved'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 me-2" />
                      {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
