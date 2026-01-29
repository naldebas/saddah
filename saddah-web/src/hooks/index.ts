// Query keys for consistent cache management
export { queryKeys } from './queryKeys';

// Contacts hooks
export {
  useContacts,
  useContact,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  usePrefetchContact,
} from './useContacts';

// Companies hooks
export {
  useCompanies,
  useCompany,
  useIndustries,
  useCities,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  usePrefetchCompany,
} from './useCompanies';

// Deals hooks
export {
  useDeals,
  useDeal,
  useDealsKanban,
  usePipelines,
  usePipeline,
  useCreateDeal,
  useUpdateDeal,
  useMoveDeal,
  useCloseDeal,
  useReopenDeal,
  useDeleteDeal,
} from './useDeals';

// Leads hooks
export {
  useLeads,
  useLead,
  useLeadStatistics,
  useCreateLead,
  useUpdateLead,
  useUpdateLeadStatus,
  useScoreLead,
  useConvertLead,
  useDeleteLead,
} from './useLeads';

// Activities hooks
export {
  useActivities,
  useActivity,
  useActivityTimeline,
  useCreateActivity,
  useUpdateActivity,
  useCompleteActivity,
  useUncompleteActivity,
  useDeleteActivity,
} from './useActivities';

// Pipelines hooks (re-export for convenience)
export {
  usePipelines as usePipelinesList,
  usePipeline as usePipelineDetail,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
} from './usePipelines';

// Dashboard hooks
export {
  useDashboardStats,
  useRecentActivities,
  useSalesLeaderboard,
  useMonthlyRevenue,
  useDashboardWidgets,
  useDealsByStage,
  useLeadsBySource,
  useUpcomingActivities,
} from './useDashboard';

// Notifications hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from './useNotifications';

// Conversations hooks
export {
  useConversations,
  useMyConversations,
  useUnassignedConversations,
  useConversation,
  useConversationStatistics,
  useMessages,
  useInfiniteMessages,
  useCreateConversation,
  useUpdateConversation,
  useAssignConversation,
  useTakeConversation,
  useCloseConversation,
  useReopenConversation,
  useLinkConversationToContact,
  useSendMessage,
} from './useConversations';
