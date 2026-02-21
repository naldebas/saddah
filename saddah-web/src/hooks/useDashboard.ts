import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { dashboardApi } from '@/services/dashboard.api';

/**
 * Hook to fetch all dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dashboardApi.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Hook to fetch recent activities for dashboard
 */
export function useRecentActivities(limit = 5) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivities(),
    queryFn: () => dashboardApi.getRecentActivities(limit),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to fetch sales leaderboard
 */
export function useSalesLeaderboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.leaderboard(),
    queryFn: () => dashboardApi.getSalesPerformance(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch monthly revenue trend
 */
export function useMonthlyRevenue(months = 6) {
  return useQuery({
    queryKey: queryKeys.dashboard.monthlyTrend(),
    queryFn: () => dashboardApi.getMonthlyRevenue(months),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch all dashboard widgets at once (more efficient for initial load)
 */
export function useDashboardWidgets() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardApi.getAllWidgets(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch deals by stage for charts
 */
export function useDealsByStage() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'deals-by-stage'],
    queryFn: () => dashboardApi.getDealsByStage(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to fetch leads by source for charts
 */
export function useLeadsBySource() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'leads-by-source'],
    queryFn: () => dashboardApi.getLeadsBySource(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to fetch upcoming activities for the current user
 */
export function useUpcomingActivities(limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'upcoming-activities'],
    queryFn: () => dashboardApi.getUpcomingActivities(limit),
    staleTime: 1000 * 60 * 2,
  });
}
