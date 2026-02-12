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
    (data: CreateCategoryRequest) => {
      // Generar slug automáticamente si no se proporciona
      const slug = data.slug || AdminCategoriesService.generateSlug(data.name)
      // Convertir CreateCategoryRequest a AdminCategory
      // Solo incluir propiedades opcionales si tienen valor definido (exactOptionalPropertyTypes)
      const categoryData: AdminCategory = {
        name: data.name,
        slug: slug,
        isActive: data.isActive ?? true,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      }
      return AdminCategoriesService.createCategory(categoryData)
    },
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.CATEGORIES]],
    }
  )
}

// Hook para actualizar categoría
export function useUpdateCategory() {
  return useOptimizedMutation(
    ({ id, data }: { id: string; data: CreateCategoryRequest }) => {
      // Preparar los datos para actualización
      const updateData: Partial<AdminCategory> = {}
      
      if (data.name !== undefined) {
        updateData.name = data.name
        // Si se actualiza el nombre y no se proporciona slug, generarlo automáticamente
        if (data.slug === undefined) {
          updateData.slug = AdminCategoriesService.generateSlug(data.name)
        }
      }
      if (data.description !== undefined) updateData.description = data.description
      if (data.slug !== undefined) updateData.slug = data.slug
      if (data.isActive !== undefined) updateData.isActive = data.isActive
      if (data.image !== undefined) updateData.image = data.image
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
      if (data.parentId !== undefined) updateData.parentId = data.parentId
      
      return AdminCategoriesService.updateCategory(id, updateData)
    },
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








