/**
 * Centralized query key factory for React Query
 * This ensures consistent cache key management across the application
 */

// Generic params type for query keys
type QueryParams = Record<string, unknown> | object;

export const queryKeys = {
  // Contacts
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.contacts.lists(), params] as const,
    details: () => [...queryKeys.contacts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
  },

  // Companies
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.companies.lists(), params] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    industries: () => [...queryKeys.companies.all, 'industries'] as const,
    cities: () => [...queryKeys.companies.all, 'cities'] as const,
  },

  // Deals
  deals: {
    all: ['deals'] as const,
    lists: () => [...queryKeys.deals.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.deals.lists(), params] as const,
    details: () => [...queryKeys.deals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deals.details(), id] as const,
    kanban: (pipelineId: string) => [...queryKeys.deals.all, 'kanban', pipelineId] as const,
    statistics: () => [...queryKeys.deals.all, 'statistics'] as const,
  },

  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.leads.lists(), params] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    statistics: () => [...queryKeys.leads.all, 'statistics'] as const,
  },

  // Activities
  activities: {
    all: ['activities'] as const,
    lists: () => [...queryKeys.activities.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.activities.lists(), params] as const,
    details: () => [...queryKeys.activities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.activities.details(), id] as const,
    timeline: (contactId?: string, dealId?: string) =>
      [...queryKeys.activities.all, 'timeline', { contactId, dealId }] as const,
    upcoming: () => [...queryKeys.activities.all, 'upcoming'] as const,
    statistics: () => [...queryKeys.activities.all, 'statistics'] as const,
  },

  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    lists: () => [...queryKeys.pipelines.all, 'list'] as const,
    list: () => [...queryKeys.pipelines.lists()] as const,
    details: () => [...queryKeys.pipelines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pipelines.details(), id] as const,
    default: () => [...queryKeys.pipelines.all, 'default'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentActivities: () => [...queryKeys.dashboard.all, 'recent-activities'] as const,
    leaderboard: () => [...queryKeys.dashboard.all, 'leaderboard'] as const,
    monthlyTrend: () => [...queryKeys.dashboard.all, 'monthly-trend'] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    sales: (params: QueryParams) => [...queryKeys.reports.all, 'sales', params] as const,
    leads: (params: QueryParams) => [...queryKeys.reports.all, 'leads', params] as const,
    activities: (params: QueryParams) => [...queryKeys.reports.all, 'activities', params] as const,
    contacts: (params: QueryParams) => [...queryKeys.reports.all, 'contacts', params] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: () => [...queryKeys.users.lists()] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    global: (query: string) => [...queryKeys.search.all, 'global', query] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // Conversations
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...queryKeys.conversations.all, 'list'] as const,
    list: (params: QueryParams) => [...queryKeys.conversations.lists(), params] as const,
    my: (params: QueryParams) => [...queryKeys.conversations.all, 'my', params] as const,
    unassigned: (params: QueryParams) => [...queryKeys.conversations.all, 'unassigned', params] as const,
    details: () => [...queryKeys.conversations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.conversations.details(), id] as const,
    messages: (conversationId: string, params?: QueryParams) =>
      [...queryKeys.conversations.all, conversationId, 'messages', params] as const,
    statistics: () => [...queryKeys.conversations.all, 'statistics'] as const,
  },
};
