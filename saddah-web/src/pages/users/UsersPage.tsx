import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, UserCheck, Shield, Briefcase, Mail } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/services/user.api';
import { CreateUserModal } from '../settings/CreateUserModal';
import { EditUserModal } from '../settings/EditUserModal';

const roleColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  admin: 'error',
  sales_manager: 'warning',
  sales_rep: 'primary',
};

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales_manager: 'مدير المبيعات',
  sales_rep: 'مندوب مبيعات',
};

export function UsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // Redirect non-admin users
  if (currentUser?.role !== 'admin') {
    navigate('/dashboard');
    return null;
  }

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Build query params
  const queryParams = useMemo(() => ({
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === '' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  }), [search, roleFilter, statusFilter, sortBy, sortOrder]);

  // React Query hooks
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useUsers(queryParams);

  // Filter users client-side for search (since backend may not support all filters)
  const filteredUsers = useMemo(() => {
    let result = users;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(user =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === 'active';
      result = result.filter(user => (user.isActive ?? true) === isActive);
    }

    return result;
  }, [users, search, roleFilter, statusFilter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive !== false).length;
    const admins = users.filter(u => u.role === 'admin').length;
    const managers = users.filter(u => u.role === 'sales_manager').length;
    const salesReps = users.filter(u => u.role === 'sales_rep').length;

    return { total, active, admins, managers, salesReps };
  }, [users]);

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSuccess = () => {
    refetch();
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t('admin.users.name', 'الاسم'),
      sortable: true,
      cell: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="font-semibold text-primary-600">
                {user.firstName?.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('admin.users.email', 'البريد الإلكتروني'),
      sortable: true,
      cell: (user: User) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="w-4 h-4" />
          <span dir="ltr">{user.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('admin.users.role', 'الدور'),
      sortable: true,
      cell: (user: User) => (
        <Badge variant={roleColors[user.role] || 'default'}>
          {roleLabels[user.role] || user.role}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: t('admin.users.status', 'الحالة'),
      sortable: true,
      cell: (user: User) => (
        <Badge variant={user.isActive !== false ? 'success' : 'default'}>
          {user.isActive !== false ? t('common.active', 'نشط') : t('common.inactive', 'غير نشط')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('admin.users.createdAt', 'تاريخ الإنشاء'),
      sortable: true,
      cell: (user: User) => (
        <span className="text-sm text-gray-500">
          {new Date(user.createdAt).toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: t('admin.users.lastLogin', 'آخر دخول'),
      cell: (user: User) => (
        <span className="text-sm text-gray-500">
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleDateString('ar-SA')
            : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin.users.title', 'إدارة المستخدمين')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('admin.users.subtitle', 'إدارة مستخدمي النظام وصلاحياتهم')}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          {t('admin.users.addUser', 'إضافة مستخدم')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.users.total', 'إجمالي المستخدمين')}</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.users.active', 'نشط')}</p>
              <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.users.admins', 'مدراء النظام')}</p>
              <p className="text-2xl font-bold text-red-600">{statistics.admins}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.users.managers', 'مدراء المبيعات')}</p>
              <p className="text-2xl font-bold text-yellow-600">{statistics.managers}</p>
            </div>
            <Badge variant="warning">{statistics.managers}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.users.salesReps', 'مندوبي المبيعات')}</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.salesReps}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label={t('admin.users.filterByRole', 'تصفية حسب الدور')}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t('admin.users.allRoles', 'جميع الأدوار')}</option>
            <option value="admin">{roleLabels.admin}</option>
            <option value="sales_manager">{roleLabels.sales_manager}</option>
            <option value="sales_rep">{roleLabels.sales_rep}</option>
          </Select>
          <Select
            label={t('admin.users.filterByStatus', 'تصفية حسب الحالة')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('admin.users.allStatuses', 'جميع الحالات')}</option>
            <option value="active">{t('common.active', 'نشط')}</option>
            <option value="inactive">{t('common.inactive', 'غير نشط')}</option>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          data={filteredUsers}
          columns={columns}
          isLoading={isLoading}
          onSort={handleSort}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSearchChange={(value) => setSearch(value)}
          searchPlaceholder={t('admin.users.searchPlaceholder', 'ابحث بالاسم أو البريد الإلكتروني...')}
          emptyMessage={t('admin.users.noUsers', 'لا يوجد مستخدمين')}
          onRowClick={handleRowClick}
        />
      )}

      {/* Create Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Edit Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default UsersPage;
