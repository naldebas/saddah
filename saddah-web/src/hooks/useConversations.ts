import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  conversationsApi,
  type CreateConversationDto,
  type UpdateConversationDto,
  type SendMessageDto,
  type QueryConversationsParams,
  type QueryMessagesParams,
} from '@/services/conversations.api';

/**
 * Hook to fetch conversations with pagination
 */
export function useConversations(params?: QueryConversationsParams) {
  return useQuery({
    queryKey: queryKeys.conversations.list(params || {}),
    queryFn: () => conversationsApi.getAll(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch current user's conversations
 */
export function useMyConversations(params?: QueryConversationsParams) {
  return useQuery({
    queryKey: queryKeys.conversations.my(params || {}),
    queryFn: () => conversationsApi.getMy(params),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // Auto-refetch every minute
  });
}

/**
 * Hook to fetch unassigned conversations
 */
export function useUnassignedConversations(params?: QueryConversationsParams) {
  return useQuery({
    queryKey: queryKeys.conversations.unassigned(params || {}),
    queryFn: () => conversationsApi.getUnassigned(params),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

/**
 * Hook to fetch a single conversation by ID
 */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(id || ''),
    queryFn: () => conversationsApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch conversation statistics
 */
export function useConversationStatistics() {
  return useQuery({
    queryKey: queryKeys.conversations.statistics(),
    queryFn: () => conversationsApi.getStatistics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch messages for a conversation
 */
export function useMessages(conversationId: string | null, params?: QueryMessagesParams) {
  return useQuery({
    queryKey: queryKeys.conversations.messages(conversationId || '', params),
    queryFn: () => conversationsApi.getMessages(conversationId!, params),
    enabled: !!conversationId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds when active
  });
}

/**
 * Hook for infinite scrolling messages
 */
export function useInfiniteMessages(conversationId: string | null, limit = 50) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.conversations.messages(conversationId || ''), 'infinite'],
    queryFn: ({ pageParam }) =>
      conversationsApi.getMessages(conversationId!, {
        limit,
        before: pageParam,
      }),
    enabled: !!conversationId,
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < limit) return undefined;
      return lastPage.data[0]?.id;
    },
    initialPageParam: undefined as string | undefined,
  });
}

/**
 * Hook to create a conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateConversationDto) => conversationsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

/**
 * Hook to update a conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateConversationDto }) =>
      conversationsApi.update(id, dto),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
    },
  });
}

/**
 * Hook to assign a conversation to a user
 */
export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      conversationsApi.assign(id, assignedToId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

/**
 * Hook to take (self-assign) a conversation
 */
export function useTakeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => conversationsApi.take(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

/**
 * Hook to close a conversation
 */
export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      conversationsApi.close(id, reason),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

/**
 * Hook to reopen a conversation
 */
export function useReopenConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => conversationsApi.reopen(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

/**
 * Hook to link a conversation to a contact
 */
export function useLinkConversationToContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      conversationsApi.linkToContact(id, contactId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversations.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
    },
  });
}

/**
 * Hook to send a message in a conversation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, dto }: { conversationId: string; dto: SendMessageDto }) =>
      conversationsApi.sendMessage(conversationId, dto),
    onMutate: async ({ conversationId, dto }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      });

      // Snapshot previous values
      const previousMessages = queryClient.getQueryData(
        queryKeys.conversations.messages(conversationId, {})
      );

      // Optimistically add the new message
      queryClient.setQueryData(
        queryKeys.conversations.messages(conversationId, {}),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: [
              ...old.data,
              {
                id: `temp-${Date.now()}`,
                conversationId,
                ...dto,
                status: 'sending',
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
      );

      return { previousMessages };
    },
    onError: (_err, { conversationId }, context) => {
      // Revert on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.conversations.messages(conversationId, {}),
          context.previousMessages
        );
      }
    },
    onSettled: (_data, _error, { conversationId }) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      });
      // Also update conversation list to show latest message
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });
    },
  });
}
