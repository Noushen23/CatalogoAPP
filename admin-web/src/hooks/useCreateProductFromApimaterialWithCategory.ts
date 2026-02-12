import { useOptimizedMutation, useOptimizedQuery } from './useApi'
import { AdminProductsService } from '@/lib/admin-products'
import { AdminCategoriesService } from '@/lib/admin-categories'
import { MaterialTNS } from '@/lib/apimaterial-service'
import { CONFIG } from '@/lib/config'
import { useQueryClient } from '@tanstack/react-query'

// Hook para obtener categorías disponibles
export function useAvailableCategories() {
  return useOptimizedQuery(
    ['categories'],
    async () => {
      const response = await AdminCategoriesService.getCategories()
      return response.data || []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (gcTime reemplaza cacheTime en React Query v5)
    }
  )
}

// Hook para crear producto desde material Apimaterial con categoría válida
export function useCreateProductFromApimaterialWithCategory() {
  const { data: categories } = useAvailableCategories()
  const queryClient = useQueryClient()
  
  return useOptimizedMutation(
    async (material: MaterialTNS) => {
      
      // Validaciones previas
      if (!material.CODIGO) {
        throw new Error('El material no tiene código válido')
      }
      
      if (!material.DESCRIP) {
        throw new Error('El material no tiene descripción válida')
      }
      
      // Verificar si el producto ya existe
      try {
        const existsCheck = await AdminProductsService.checkProductExists(material.CODIGO, material.MATID)
        
        if (existsCheck.exists && existsCheck.product) {
          return {
            success: false,
            message: `El producto "${material.DESCRIP}" ya existe con ${existsCheck.searchField}: ${existsCheck.searchValue}`,
            data: null,
            material: material,
            existingProduct: existsCheck.product,
            duplicateField: existsCheck.searchField,
            duplicateValue: existsCheck.searchValue
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.warn('⚠️ Error verificando producto existente:', errorMessage)
        // Continuar con la creación si hay error en la verificación
      }
      
      // Obtener la primera categoría válida
      let categoryId = null
      if (categories && categories.length > 0) {
        categoryId = categories[0].id
      } else {
        console.warn('⚠️ No hay categorías disponibles, creando sin categoría')
      }
      
      // Mapear material Apimaterial a datos de producto
      const productData = {
        title: material.DESCRIP || 'Material sin descripción',
        description: material.OBSERV || `Material ${material.CODIGO} `,
        price: material.PRECIO1 || 0,
        stock: material.EXISTEC || 0,
        categoryId: categoryId,
        isActive: material.INACTIVO !== 'S',
        isFeatured: false,
        sku: material.CODIGO, // ← AQUÍ se inserta el código en el campo SKU
        CodVinculacion: material.MATID, // ← AQUÍ se inserta el MATID en CodVinculacion
        tags: [
          `${material.CODIGO}`,
          `unidad-${material.UNIDAD}`
        ],
        images: [], // Se pueden agregar imágenes por separado
      }
      
      console.warn('📋 Datos del producto a crear:', {
        title: productData.title,
        price: productData.price,
        stock: productData.stock,
        categoryId: productData.categoryId,
        isActive: productData.isActive,
        sku: productData.sku,
        CodVinculacion: productData.CodVinculacion
      })
      
      try {
        // Crear el producto en MySQL
        
        const result = await AdminProductsService.createProduct(productData)
        
        // Invalidar cache de verificación de productos existentes
        queryClient.invalidateQueries({
          queryKey: ['check-product-exists', material.CODIGO, material.MATID]
        })
        
        // También invalidar por SKU individual
        queryClient.invalidateQueries({
          queryKey: ['check-product-exists', material.CODIGO]
        })
        
        // Y por CodVinculacion individual
        queryClient.invalidateQueries({
          queryKey: ['check-product-exists', undefined, material.MATID]
        })
        
        return {
          success: true,
          message: `Producto "${material.DESCRIP}" creado exitosamente`,
          data: result,
          material: material,
          productId: result.data?.id
        }
      } catch (error) {
        const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.error('❌ Error creando producto:', {
          material: material.CODIGO,
          error: errorMessage,
          status: response?.status,
          details: response?.data
        })
        
        // Mensaje de error más amigable
        let friendlyMessage = errorMessage
        if (response?.status === 409) {
          friendlyMessage = `El producto con código ${material.CODIGO} ya existe`
        } else if (response?.status === 400) {
          friendlyMessage = response?.data?.message || 'Datos de producto inválidos'
        } else if (!navigator.onLine) {
          friendlyMessage = 'Sin conexión a internet'
        }
        
        return {
          success: false,
          message: `Error: ${friendlyMessage}`,
          data: null,
          material: material,
          error: error
        }
      }
    },
    {
      invalidateQueries: [
        [CONFIG.CACHE_KEYS.PRODUCTS],
        [CONFIG.CACHE_KEYS.DASHBOARD_STATS],
        [CONFIG.CACHE_KEYS.TOP_PRODUCTS],
      ],
    }
  )
}
