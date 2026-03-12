import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  productsApi,
  type Product,
  type QueryProductsParams,
  type CreateProductDto,
  type UpdateProductDto,
  type SearchProductsParams,
  type ProductStatus,
} from '@/services/products.api';

/**
 * Hook to fetch paginated products list
 */
export function useProducts(params: QueryProductsParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch product statistics
 */
export function useProductStatistics() {
  return useQuery({
    queryKey: queryKeys.products.statistics(),
    queryFn: () => productsApi.getStatistics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to search products based on criteria
 */
export function useSearchProducts(params: SearchProductsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.products.search(params),
    queryFn: () => productsApi.search(params),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch product suggestions for a lead
 */
export function useProductSuggestions(leadId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.suggestions(leadId!),
    queryFn: () => productsApi.getSuggestionsForLead(leadId!),
    enabled: !!leadId,
  });
}

/**
 * Hook to create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.statistics() });
      // Also invalidate the parent project
      if (product.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(product.projectId)
        });
      }
      toast.success('تم إنشاء الوحدة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to create product:', error);
      toast.error('فشل في إنشاء الوحدة');
    },
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) });

      const previousProduct = queryClient.getQueryData<Product>(
        queryKeys.products.detail(id)
      );

      if (previousProduct) {
        queryClient.setQueryData<Product>(queryKeys.products.detail(id), {
          ...previousProduct,
          ...data,
        });
      }

      return { previousProduct };
    },
    onError: (error, { id }, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(id),
          context.previousProduct
        );
      }
      console.error('Failed to update product:', error);
      toast.error('فشل في تحديث الوحدة');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.statistics() });
    },
    onSuccess: () => {
      toast.success('تم تحديث الوحدة بنجاح');
    },
  });
}

/**
 * Hook to update product status
 */
export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productsApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) });

      const previousProduct = queryClient.getQueryData<Product>(
        queryKeys.products.detail(id)
      );

      if (previousProduct) {
        queryClient.setQueryData<Product>(queryKeys.products.detail(id), {
          ...previousProduct,
          status,
        });
      }

      return { previousProduct };
    },
    onError: (error, { id }, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(id),
          context.previousProduct
        );
      }
      console.error('Failed to update product status:', error);
      toast.error('فشل في تحديث حالة الوحدة');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.statistics() });
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة الوحدة بنجاح');
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.statistics() });
      toast.success('تم حذف الوحدة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Failed to delete product:', error);
      toast.error('فشل في حذف الوحدة');
    },
  });
}

/**
 * Hook to update suggestion status
 */
export function useUpdateSuggestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      productId,
      status,
    }: {
      leadId: string;
      productId: string;
      status: 'viewed' | 'interested' | 'rejected';
    }) => productsApi.updateSuggestionStatus(leadId, productId, status),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.suggestions(leadId)
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update suggestion status:', error);
      toast.error('فشل في تحديث حالة الاقتراح');
    },
  });
}
