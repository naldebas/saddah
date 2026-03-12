import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  UserPlus,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronRight,
  X,
  Calendar,
  GitBranch,
  Shield,
  UsersRound,
  Home,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/contacts', icon: Users, labelKey: 'nav.contacts' },
  { path: '/companies', icon: Building2, labelKey: 'nav.companies' },
  { path: '/deals', icon: Briefcase, labelKey: 'nav.deals' },
  { path: '/leads', icon: UserPlus, labelKey: 'nav.leads' },
  { path: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
  { path: '/products', icon: Home, labelKey: 'nav.products' },
  { path: '/activities', icon: Calendar, labelKey: 'nav.activities' },
  { path: '/conversations', icon: MessageSquare, labelKey: 'nav.conversations' },
  { path: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

const adminNavItems = [
  { path: '/admin/users', icon: UsersRound, labelKey: 'nav.admin.users' },
  { path: '/pipelines', icon: GitBranch, labelKey: 'nav.pipelines' },
];

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 bg-white border-e border-gray-200 transition-all duration-300 hidden lg:block',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ص</span>
                </div>
                <span className="font-bold text-xl text-gray-900">صداح</span>
              </div>
            )}
            {isCollapsed && (
              <div className="mx-auto h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">ص</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    isCollapsed && 'justify-center'
                  )
                }
                title={isCollapsed ? t(item.labelKey) : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            ))}

            {/* Admin Section */}
            {isAdmin && (
              <>
                <div className={cn(
                  'mt-4 pt-4 border-t border-gray-200',
                  isCollapsed && 'mt-2 pt-2'
                )}>
                  {!isCollapsed && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                      <Shield className="h-4 w-4" />
                      <span>{t('nav.admin.section', 'الإدارة')}</span>
                    </div>
                  )}
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                          isCollapsed && 'justify-center'
                        )
                      }
                      title={isCollapsed ? t(item.labelKey) : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{t(item.labelKey, 'المستخدمين')}</span>}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Collapse button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
              aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              <ChevronRight
                className={cn(
                  'h-5 w-5 transition-transform',
                  !isCollapsed && 'rotate-180 rtl:rotate-0'
                )}
              />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 w-64 bg-white border-e border-gray-200 transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">ص</span>
              </div>
              <span className="font-bold text-xl text-gray-900">صداح</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              type="button"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}

            {/* Admin Section - Mobile */}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                  <Shield className="h-4 w-4" />
                  <span>{t('nav.admin.section', 'الإدارة')}</span>
                </div>
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-red-50 text-red-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{t(item.labelKey, 'المستخدمين')}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
