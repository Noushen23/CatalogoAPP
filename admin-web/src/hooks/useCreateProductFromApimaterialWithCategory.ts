import { useOptimizedMutation, useOptimizedQuery } from './useApi'
import { AdminProductsService } from '@/lib/admin-products'
import { AdminCategoriesService } from '@/lib/admin-categories'
import { MaterialTNS } from '@/lib/apimaterial-service'
import { CONFIG } from '@/lib/config'

// Hook para obtener categorías disponibles
export function useAvailableCategories() {
  return useOptimizedQuery(
    ['categories'],
    async () => {
      console.log('🔍 Obteniendo categorías disponibles...')
      const response = await AdminCategoriesService.getCategories()
      console.log('📋 Categorías obtenidas:', response.data)
      return response.data || []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    }
  )
}

// Hook para crear producto desde material Apimaterial con categoría válida
export function useCreateProductFromApimaterialWithCategory() {
  const { data: categories } = useAvailableCategories()
  
  return useOptimizedMutation(
    async (material: MaterialTNS) => {
      console.log('🔄 Creando producto desde material Apimaterial:', material.CODIGO)
      
      // Obtener la primera categoría válida
      let categoryId = null
      if (categories && categories.length > 0) {
        categoryId = categories[0].id
        console.log('📋 Usando categoría:', categories[0].name, 'ID:', categoryId)
      } else {
        console.log('⚠️ No hay categorías disponibles, creando sin categoría')
      }
      
      // Mapear material Apimaterial a datos de producto
      const productData = {
        title: material.DESCRIP || 'Material sin descripción',
        description: material.OBSERV || `Material ${material.CODIGO} de Apimaterial`,
        price: material.PRECIO1 || 0,
        priceOffer: material.PRECIO2 && material.PRECIO2 > 0 ? material.PRECIO2 : null,
        stock: 0, // Los materiales Apimaterial no tienen stock directo
        categoryId: categoryId,
        isActive: material.INACTIVO !== 'S',
        isFeatured: false,
        tags: [
          `apimaterial-${material.CODIGO}`,
          `unidad-${material.UNIDAD}`,
          'importado-apimaterial'
        ],
        images: [], // Se pueden agregar imágenes por separado
        barcode: material.CODIGO,
        sku: material.CODIGO,
        weight: null,
        dimensions: null,
        sizes: [],
        gender: 'unisex'
      }
      
      console.log('📋 Datos del producto a crear:', productData)
      
      try {
        // Crear el producto en MySQL
        console.log('🚀 ===== INICIANDO CREACIÓN DE PRODUCTO =====')
        console.log('📋 Material Apimaterial:', material)
        console.log('📦 Datos del producto a crear:', productData)
        console.log('🔗 Llamando a AdminProductsService.createProduct...')
        
        const result = await AdminProductsService.createProduct(productData)
        console.log('✅ ===== PRODUCTO CREADO EXITOSAMENTE =====')
        console.log('📊 Resultado completo:', result)
        
        return {
          success: true,
          message: `Producto "${material.DESCRIP}" creado exitosamente`,
          data: result,
          material: material,
          simulated: false
        }
      } catch (error: any) {
        console.error('❌ ===== ERROR CREANDO PRODUCTO =====')
        console.error('📋 Material que falló:', material)
        console.error('📦 Datos que fallaron:', productData)
        console.error('🚨 Error completo:', error)
        console.error('📝 Detalles del error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          timeout: error.config?.timeout
        })
        
        return {
          success: false,
          message: `Error creando producto "${material.DESCRIP}": ${error.message}`,
          data: null,
          material: material,
          error: error,
          simulated: false
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














