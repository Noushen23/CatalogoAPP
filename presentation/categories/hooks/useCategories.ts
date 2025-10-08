import { useQuery } from '@tanstack/react-query';
import { categoriesApi, CategoryFilters } from '@/core/api/categoriesApi';
import { CACHE_TIMES } from '@/constants/App';

export const useCategories = (filters: CategoryFilters = {}) => {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: async () => {
      const response = await categoriesApi.getCategories(filters);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.ONE_HOUR,
  });
};

export const useCategory = (id: string) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const response = await categoriesApi.getCategoryById(id);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.ONE_HOUR,
    enabled: !!id,
  });
};

export const useCategoryProducts = (
  categoryId: string, 
  filters: { activo?: boolean; destacado?: boolean; limit?: number } = {}
) => {
  return useQuery({
    queryKey: ['category-products', categoryId, filters],
    queryFn: async () => {
      const response = await categoriesApi.getCategoryProducts(categoryId, filters);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.THIRTY_MINUTES,
    enabled: !!categoryId,
  });
};
