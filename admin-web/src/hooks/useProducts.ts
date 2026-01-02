import { useOptimizedQuery, useOptimizedMutation } from './useApi'
import { AdminProductsService, AdminProduct } from '@/lib/admin-products'
import { CONFIG } from '@/lib/config'
import { CreateProductRequest } from '@/types'

// Hook para obtener todos los productos con filtros
export function useProducts(filters?: {
  search?: string
  status?: string
  category?: string
  gender?: string
  price?: string
  stock?: string
}) {
  return useOptimizedQuery(
    [CONFIG.CACHE_KEYS.PRODUCTS, filters],
    () => AdminProductsService.getProducts(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutos para productos
    }
  )
}

// Hook para obtener un producto específico
export function useProduct(id: string) {
  return useOptimizedQuery(
    [CONFIG.CACHE_KEYS.PRODUCTS, id],
    () => AdminProductsService.getProduct(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutos para producto individual
    }
  )
}

// Hook para crear producto
export function useCreateProduct() {
  return useOptimizedMutation(
    (data: CreateProductRequest) => AdminProductsService.createProduct(data),
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.PRODUCTS],
        [CONFIG.CACHE_KEYS.DASHBOARD_STATS],
        [CONFIG.CACHE_KEYS.TOP_PRODUCTS],
      ],
    }
  )
}

// Hook para actualizar producto
export function useUpdateProduct() {
  return useOptimizedMutation(
    ({ id, data }: { id: string; data: CreateProductRequest }) =>
      AdminProductsService.updateProduct(id, data),
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.PRODUCTS],
        [CONFIG.CACHE_KEYS.DASHBOARD_STATS],
        [CONFIG.CACHE_KEYS.TOP_PRODUCTS],
      ],
    }
  )
}

// Hook para eliminar producto
export function useDeleteProduct() {
  return useOptimizedMutation(
    (id: string) => AdminProductsService.deleteProduct(id),
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.PRODUCTS],
        [CONFIG.CACHE_KEYS.DASHBOARD_STATS],
        [CONFIG.CACHE_KEYS.TOP_PRODUCTS],
      ],
    }
  )
}

// Hook para subir imágenes
export function useUploadProductImages() {
  return useOptimizedMutation(
    ({ productId, files }: { productId: string; files: FileList }) =>
      AdminProductsService.uploadProductImages(productId, files),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.PRODUCTS]],
    }
  )
}

// Hook para eliminar imagen
export function useDeleteProductImage() {
  return useOptimizedMutation(
    ({ productId, imageIndex }: { productId: string; imageIndex: number }) =>
      AdminProductsService.deleteProductImage(productId, imageIndex),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.PRODUCTS]],
    }
  )
}

// Hook para actualizar metadatos de imagen
export function useUpdateImageMetadata() {
  return useOptimizedMutation(
    ({ productId, imageId, metadata }: { 
      productId: string; 
      imageId: string; 
      metadata: { alt_text?: string; orden?: number; esPrincipal?: boolean }
    }) =>
      AdminProductsService.updateImageMetadata(productId, imageId, metadata),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.PRODUCTS]],
    }
  )
}

// Hook para reordenar imágenes
export function useReorderImages() {
  return useOptimizedMutation(
    ({ productId, imageIds }: { productId: string; imageIds: string[] }) =>
      AdminProductsService.reorderImages(productId, imageIds),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.PRODUCTS]],
    }
  )
}

// Hook para marcar imagen como principal
export function useSetMainImage() {
  return useOptimizedMutation(
    ({ productId, imageId }: { productId: string; imageId: string }) =>
      AdminProductsService.setMainImage(productId, imageId),
    {
      invalidateQueries: [[CONFIG.CACHE_KEYS.PRODUCTS]],
    }
  )
}








