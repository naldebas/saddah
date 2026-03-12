import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, Home } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useProjects, useProjectStatistics, useProjectCities } from '@/hooks';
import type { Project, ProjectType, ProjectStatus } from '@/services/projects.api';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  active: 'success',
  coming_soon: 'warning',
  sold_out: 'error',
};

const statusLabels: Record<string, string> = {
  active: 'نشط',
  coming_soon: 'قريباً',
  sold_out: 'مباع بالكامل',
};

const typeLabels: Record<string, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  mixed: 'مختلط',
};

export function ProjectsPage() {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProjectType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Build query params
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 12,
    search: search || undefined,
    city: cityFilter || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  }), [currentPage, search, cityFilter, typeFilter, statusFilter]);

  // React Query hooks
  const { data: projectsData, isLoading } = useProjects(queryParams);
  const { data: statistics, isLoading: isStatsLoading } = useProjectStatistics();
  const { data: cities } = useProjectCities();

  // Extract data
  const projects = projectsData?.data ?? [];
  const totalPages = projectsData?.meta.totalPages ?? 1;
  const totalItems = projectsData?.meta.total ?? 0;

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المشاريع العقارية</h1>
          <p className="text-gray-600 mt-1">إدارة المشاريع والوحدات العقارية</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة مشروع
        </Button>
      </div>

      {/* Statistics Cards */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المشاريع</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مشاريع نشطة</p>
                <p className="text-2xl font-bold text-green-600">{statistics.byStatus.active}</p>
              </div>
              <Badge variant="success">نشط</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">قريباً</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.byStatus.comingSoon}</p>
              </div>
              <Badge variant="warning">قريباً</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مباع بالكامل</p>
                <p className="text-2xl font-bold text-red-600">{statistics.byStatus.soldOut}</p>
              </div>
              <Badge variant="error">مباع</Badge>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="بحث"
            placeholder="ابحث باسم المشروع..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Select
            label="المدينة"
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">جميع المدن</option>
            {cities?.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </Select>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ProjectType | '');
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الأنواع</option>
            <option value="residential">سكني</option>
            <option value="commercial">تجاري</option>
            <option value="mixed">مختلط</option>
          </Select>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProjectStatus | '');
              setCurrentPage(1);
            }}
          >
            <option value="">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="coming_soon">قريباً</option>
            <option value="sold_out">مباع بالكامل</option>
          </Select>
        </div>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مشاريع</h3>
          <p className="text-gray-600 mb-4">ابدأ بإضافة مشروع جديد</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مشروع
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                {/* Project Image */}
                <div className="h-40 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-white/50" />
                </div>

                {/* Project Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                    <Badge variant={statusColors[project.status] || 'default'}>
                      {statusLabels[project.status] || project.status}
                    </Badge>
                  </div>

                  <div className="flex items-center text-gray-600 text-sm mb-3">
                    <MapPin className="w-4 h-4 ml-1" />
                    {project.city}
                    {project.district && ` - ${project.district}`}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {typeLabels[project.type] || project.type}
                    </span>
                    <div className="flex items-center text-gray-600">
                      <Home className="w-4 h-4 ml-1" />
                      {project.productStats?.total || project.totalUnits || 0} وحدة
                    </div>
                  </div>

                  {/* Product Stats */}
                  {project.productStats && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600">متاحة: {project.productStats.available}</span>
                        <span className="text-yellow-600">محجوزة: {project.productStats.reserved}</span>
                        <span className="text-red-600">مباعة: {project.productStats.sold}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                عرض {((currentPage - 1) * 12) + 1} - {Math.min(currentPage * 12, totalItems)} من {totalItems}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={editingProject}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
