import { useOptimizedQuery, useOptimizedMutation } from './useApi'
import { AdminCategoriesService, AdminCategory } from '@/lib/admin-categories'
import { CONFIG } from '@/lib/config'
import { CreateCategoryRequest } from '@/types'

// Hook para obtener todas las categorías
export function useCategories() {
  return useOptimizedQuery(
    [CONFIG.CACHE_KEYS.CATEGORIES],
    () => AdminCategoriesService.getCategories(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutos para categorías (cambian poco)
    }
  )
}

// Hook para obtener una categoría específica
export function useCategory(id: string) {
  return useOptimizedQuery(
    [CONFIG.CACHE_KEYS.CATEGORIES, id],
    () => AdminCategoriesService.getCategory(id),
    {
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
    }
  )
}

// Hook para crear categoría
export function useCreateCategory() {
  return useOptimizedMutation(
    (data: CreateCategoryRequest) => AdminCategoriesService.createCategory(data),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.CATEGORIES]],
    }
  )
}

// Hook para actualizar categoría
export function useUpdateCategory() {
  return useOptimizedMutation(
    ({ id, data }: { id: string; data: CreateCategoryRequest }) =>
      AdminCategoriesService.updateCategory(id, data),
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.CATEGORIES],
        [CONFIG.CACHE_KEYS.PRODUCTS], // Los productos también pueden verse afectados
      ],
    }
  )
}

// Hook para eliminar categoría
export function useDeleteCategory() {
  return useOptimizedMutation(
    (id: string) => AdminCategoriesService.deleteCategory(id),
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.CATEGORIES],
        [CONFIG.CACHE_KEYS.PRODUCTS],
      ],
    }
  )
}








