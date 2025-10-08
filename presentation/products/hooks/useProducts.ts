import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { productsApi, ProductFilters } from '@/core/api/productsApi';
import { PAGINATION, CACHE_TIMES } from '@/constants/App';

export const useProducts = (filters: ProductFilters = {}) => {
  const productsQuery = useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await productsApi.getProducts({
        ...filters,
        page: pageParam,
        limit: PAGINATION.DEFAULT_LIMIT,
      });
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.ONE_HOUR,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage?.pagination?.totalPages || 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  return {
    productsQuery,
    loadNextPage: productsQuery.fetchNextPage,
    hasNextPage: productsQuery.hasNextPage,
    isFetchingNextPage: productsQuery.isFetchingNextPage,
  };
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await productsApi.getProductById(id);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.ONE_HOUR,
    enabled: !!id,
  });
};

export const useFeaturedProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      const response = await productsApi.getFeaturedProducts(limit);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.ONE_HOUR,
  });
};

export const useProductSearch = (searchTerm: string, filters: Omit<ProductFilters, 'busqueda'> = {}) => {
  return useQuery({
    queryKey: ['products', 'search', searchTerm, filters],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, searchTerm: '' };
      }

      const response = await productsApi.searchProducts({
        q: searchTerm,
        ...filters,
        limit: PAGINATION.DEFAULT_LIMIT,
      });
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.THIRTY_MINUTES,
    enabled: !!searchTerm.trim(),
  });
};
