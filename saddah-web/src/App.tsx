import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';

// Eager load critical pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';

// Lazy load other pages for code-splitting
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })));
const ContactDetailPage = lazy(() => import('@/pages/contacts/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })));
const DealsKanbanPage = lazy(() => import('@/pages/deals/DealsKanbanPage').then(m => ({ default: m.DealsKanbanPage })));
const CompaniesPage = lazy(() => import('@/pages/companies/CompaniesPage').then(m => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('@/pages/companies/CompanyDetailPage').then(m => ({ default: m.CompanyDetailPage })));
const LeadsPage = lazy(() => import('@/pages/leads/LeadsPage').then(m => ({ default: m.LeadsPage })));
const ActivitiesPage = lazy(() => import('@/pages/activities/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ConversationsPage = lazy(() => import('@/pages/conversations/ConversationsPage').then(m => ({ default: m.ConversationsPage })));
const PipelinesPage = lazy(() => import('@/pages/pipelines/PipelinesPage').then(m => ({ default: m.PipelinesPage })));

// Layouts
import { AppShell } from '@/components/layout/AppShell';

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <Spinner size="lg" />
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts" element={
          <Suspense fallback={<PageLoader />}>
            <ContactsPage />
          </Suspense>
        } />
        <Route path="contacts/:id" element={
          <Suspense fallback={<PageLoader />}>
            <ContactDetailPage />
          </Suspense>
        } />
        <Route path="deals" element={
          <Suspense fallback={<PageLoader />}>
            <DealsKanbanPage />
          </Suspense>
        } />
        <Route path="companies" element={
          <Suspense fallback={<PageLoader />}>
            <CompaniesPage />
          </Suspense>
        } />
        <Route path="companies/:id" element={
          <Suspense fallback={<PageLoader />}>
            <CompanyDetailPage />
          </Suspense>
        } />
        <Route path="leads" element={
          <Suspense fallback={<PageLoader />}>
            <LeadsPage />
          </Suspense>
        } />
        <Route path="activities" element={
          <Suspense fallback={<PageLoader />}>
            <ActivitiesPage />
          </Suspense>
        } />
        <Route path="conversations" element={
          <Suspense fallback={<PageLoader />}>
            <ConversationsPage />
          </Suspense>
        } />
        <Route path="reports" element={
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
        } />
        <Route path="pipelines" element={
          <Suspense fallback={<PageLoader />}>
            <PipelinesPage />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
