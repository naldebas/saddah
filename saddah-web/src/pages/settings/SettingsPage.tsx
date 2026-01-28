import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { userApi, User as UserType } from '@/services/user.api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';

type SettingsTab = 'profile' | 'notifications' | 'language' | 'security' | 'appearance' | 'team';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
      toast.error('فشل في تحميل أعضاء الفريق');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleEditUser = (member: UserType) => {
    setSelectedUser(member);
    setEditUserModalOpen(true);
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام',
    sales_manager: 'مدير المبيعات',
    sales_rep: 'مندوب مبيعات',
  };

  const tabs: TabItem[] = [
    { id: 'profile', label: 'الملف الشخصي', icon: <User className="h-5 w-5" /> },
    { id: 'notifications', label: 'الإشعارات', icon: <Bell className="h-5 w-5" /> },
    { id: 'language', label: 'اللغة', icon: <Globe className="h-5 w-5" /> },
    { id: 'security', label: 'الأمان', icon: <Lock className="h-5 w-5" /> },
    { id: 'appearance', label: 'المظهر', icon: <Palette className="h-5 w-5" /> },
    { id: 'team', label: 'الفريق', icon: <Users className="h-5 w-5" /> },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'profile') {
        const updatedUser = await userApi.updateProfile(profileData);
        setUser(updatedUser);
        toast.success('تم حفظ الملف الشخصي بنجاح');
      } else if (activeTab === 'security') {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast.error('كلمة المرور الجديدة غير متطابقة');
          return;
        }
        await userApi.changePassword(passwordData);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('تم تغيير كلمة المرور بنجاح');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الملف الشخصي</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="الاسم الأول"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="أدخل الاسم الأول"
                />
                <Input
                  label="الاسم الأخير"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="أدخل الاسم الأخير"
                />
                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  placeholder="أدخل البريد الإلكتروني"
                />
                <Input
                  label="رقم الجوال"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="أدخل رقم الجوال"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الصورة الشخصية</h3>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {user?.firstName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    تغيير الصورة
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG أو PNG. الحد الأقصى 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات الإشعارات</h3>
            <div className="space-y-4">
              {[
                { id: 'email', label: 'إشعارات البريد الإلكتروني', desc: 'استلام إشعارات عبر البريد' },
                { id: 'push', label: 'الإشعارات الفورية', desc: 'إشعارات المتصفح الفورية' },
                { id: 'deals', label: 'تحديثات الصفقات', desc: 'إشعار عند تغيير حالة الصفقات' },
                { id: 'leads', label: 'العملاء المحتملين الجدد', desc: 'إشعار عند إضافة عميل جديد' },
                { id: 'activities', label: 'تذكير الأنشطة', desc: 'تذكير قبل موعد النشاط' },
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
                    <input type="checkbox" defaultChecked className="sr-only peer" />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات اللغة</h3>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات الأمان</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">تغيير كلمة المرور</h4>
                <div className="space-y-4">
                  <Input
                    label="كلمة المرور الحالية"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                  <Input
                    label="كلمة المرور الجديدة"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <Input
                    label="تأكيد كلمة المرور"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">المصادقة الثنائية</p>
                    <p className="text-sm text-gray-500">أضف طبقة حماية إضافية لحسابك</p>
                  </div>
                  <Button variant="outline" size="sm">
                    تفعيل
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات المظهر</h3>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-3">السمة</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'فاتح', icon: '☀️' },
                    { id: 'dark', label: 'داكن', icon: '🌙' },
                    { id: 'system', label: 'النظام', icon: '💻' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        theme.id === 'light'
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
                <p className="font-medium text-gray-900 mb-3">اللون الرئيسي</p>
                <div className="flex gap-3">
                  {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      className={`h-10 w-10 rounded-full border-2 ${
                        color === '#8B5CF6' ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">أعضاء الفريق</h3>
              <Button size="sm" onClick={() => setCreateUserModalOpen(true)}>
                <UserPlus className="h-4 w-4 me-2" />
                إضافة عضو
              </Button>
            </div>
            {loadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا يوجد أعضاء في الفريق</p>
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
                        {member.isActive !== false ? 'نشط' : 'غير نشط'}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.settings')}</h1>
          <p className="text-gray-500 mt-1">إدارة إعدادات حسابك والتفضيلات</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <Card className="lg:w-64 flex-shrink-0">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
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
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Main content */}
        <Card className="flex-1">
          <CardContent>
            {renderContent()}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <Button variant="outline">إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full me-2" />
                    جاري الحفظ...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 me-2" />
                    تم الحفظ
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 me-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
