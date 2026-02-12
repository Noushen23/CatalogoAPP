import { api } from './api'
import { Product, CreateProductRequest, ProductImage } from '@/types'
import { getApiBaseUrl, getImageUrl } from './config'

// Tipos básicos para el servicio de productos
export interface AdminProduct extends Product {
  isFeatured?: boolean
  fechaCreacion?: string
  fechaActualizacion?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ProductFilters {
  search?: string
  status?: string
  categoriaId?: string
  category?: string
  stockFilter?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface BackendProductImage {
  id?: string
  url?: string
  url_imagen?: string
  urlImagen?: string
  orden?: number
  alt_text?: string
  esPrincipal?: boolean
  es_principal?: boolean
  [key: string]: unknown
}

interface BackendProduct {
  id?: string
  nombre?: string
  title?: string
  descripcion?: string
  precio?: number
  precioOferta?: number
  enOferta?: boolean
  stock?: number
  stockMinimo?: number
  isActive?: boolean
  activo?: boolean
  destacado?: boolean
  sku?: string
  codigoBarras?: string
  imagenes?: Array<BackendProductImage | string>
  etiquetas?: unknown
  categoriaNombre?: string
  categoriaId?: string
  esServicio?: boolean
  es_servicio?: boolean
  fechaCreacion?: string
  createdAt?: string
  fechaActualizacion?: string
  updatedAt?: string
  [key: string]: unknown
}

// Helper para validar datos de producto
const validateProductData = (data: CreateProductRequest): void => {
  if (!data.title || data.title.trim() === '') {
    throw new Error('El nombre del producto es requerido')
  }
  
  if (data.price !== undefined && (isNaN(data.price) || data.price < 0)) {
    throw new Error('El precio debe ser un número positivo')
  }
  
  if (data.stock !== undefined && (isNaN(data.stock) || data.stock < 0)) {
    throw new Error('El stock debe ser un número positivo')
  }
  
  if (data.images && !Array.isArray(data.images)) {
    throw new Error('Las imágenes deben ser un array')
  }
}

// Función helper para limpiar URLs duplicadas
const cleanImageUrl = (url: string): string => {
  if (!url) return url
  
  // Usar configuración centralizada
  const baseUrl = getApiBaseUrl()
  const duplicatedPattern = `${baseUrl}${baseUrl}`
  
  if (url.startsWith(duplicatedPattern)) {
    // Remover la duplicación
    return url.replace(duplicatedPattern, baseUrl)
  }
  
  return url
}

// Servicio básico de productos para el admin
export const AdminProductsService = {
  // Obtener todos los productos con filtros y paginación
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<AdminProduct>> => {
    try {
      // Limpiar parámetros undefined para que axios los envíe
      const cleanParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([_, value]) => value !== undefined && value !== '')
      )
      
      console.warn('📡 AdminProductsService - Llamando API con filters:', cleanParams)
      const response = await api.get('/products', { params: cleanParams })
      console.warn('📡 AdminProductsService - Respuesta recibida:', response.data)
      
      // El backend devuelve: { success: true, data: { products: [...], pagination: {...} } }
      if (response.data?.success && response.data.data?.products) {
        const products = response.data.data.products
        const pagination = response.data.data.pagination
        
        // El backend ya devuelve los productos en el formato correcto
        const mappedProducts = products.map((p: BackendProduct) => ({
          id: p.id,
          title: p.nombre || p.title,
          description: p.descripcion || '',
          price: p.precio || 0,
          priceOffer: p.precioOferta,
          onOffer: Boolean(p.enOferta || p.precioOferta),
          stock: p.stock || 0,
          minStock: p.stockMinimo || 0,
          isActive: p.isActive !== undefined ? p.isActive : p.activo,
          isFeatured: Boolean(p.destacado),
          sku: p.sku,
          barcode: p.codigoBarras,
          images: p.imagenes || [],
          tags: Array.isArray(p.etiquetas) ? p.etiquetas : [],
          category: p.categoriaNombre ? {
            id: p.categoriaId || '',
            name: p.categoriaNombre
          } : null,
          categoryId: p.categoriaId || null,  
          esServicio: Boolean(p.esServicio || p.es_servicio),
          es_servicio: Boolean(p.esServicio || p.es_servicio),
          fechaCreacion: p.fechaCreacion || p.createdAt,
          fechaActualizacion: p.fechaActualizacion || p.updatedAt
        }))
        
        return {
          data: mappedProducts,
          pagination: {
            currentPage: pagination?.page || filters?.page || 1,
            totalPages: pagination?.totalPages || 0,
            totalItems: pagination?.total || 0,
            itemsPerPage: pagination?.limit || filters?.limit || 25,
            hasNextPage: pagination?.hasNextPage || false,
            hasPrevPage: pagination?.hasPrevPage || false
          }
        }
      }
      
      console.warn('❌ AdminProductsService: Formato de respuesta inesperado:', {
        hasData: !!response.data,
        hasSuccess: !!response.data?.success,
        hasDataData: !!response.data?.data,
        hasProducts: !!response.data?.data?.products
      })
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 25,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    } catch (error) {
      console.error('❌ AdminProductsService: Error fetching products:', error)
      throw error
    }
  },

  // Obtener un producto por ID
  getProduct: async (id: string) => {
    try {
      const response = await api.get(`/products/${id}`)
      
      // Mapear la respuesta del backend al formato esperado por el admin
      if (response.data && response.data.success && response.data.data && response.data.data.product) {
        const product = response.data.data.product;
        
        // Función helper para parsear JSON de forma segura
        const safeJsonParse = (str: unknown) => {
          if (!str) return null;
          try {
            return typeof str === 'string' ? JSON.parse(str) : str;
          } catch {
            console.warn('Error parseando JSON:', str);
            return null;
          }
        };
        
        // Procesar imágenes del producto
        let images: ProductImage[] = [];
        if (Array.isArray(product.imagenes) && product.imagenes.length > 0) {
          images = product.imagenes.map((img: BackendProductImage | string) => {
            // Si es un objeto con la nueva estructura
            if (typeof img === 'object' && img !== null) {
              // Obtener la URL de la imagen
              let imageUrl = img.url || img.urlImagen || img.url_imagen || '';
              
              // Limpiar URL duplicada si existe
              imageUrl = cleanImageUrl(imageUrl);
              
              // Si la URL no empieza con http, agregar la base URL
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = getImageUrl(imageUrl);
              }
              
              return {
                id: img.id || '',
                url: imageUrl,
                urlImagen: imageUrl,
                url_imagen: imageUrl,
                orden: img.orden || 0,
                alt_text: img.alt_text || '',
                esPrincipal: img.esPrincipal || img.es_principal || false
              };
            }
            // Si es string (compatibilidad con estructura anterior)
            if (typeof img === 'string') {
              let fullUrl = img.startsWith('http') ? img : getImageUrl(img);
              
              // Limpiar URL duplicada si existe
              fullUrl = cleanImageUrl(fullUrl);
              
              return {
                id: `legacy-${Date.now()}-${Math.random()}`,
                url: fullUrl,
                orden: 0,
                alt_text: ''
              };
            }
            return null;
          }).filter((img: ProductImage | null): img is ProductImage => img !== null);
        }
        
        const mappedProduct = {
          id: product.id,
          title: product.nombre || product.title || 'Producto sin nombre', // Backend usa 'nombre'
          description: product.descripcion || product.description || '',
          price: parseFloat(product.precio) || 0,
          priceOffer: product.precioOferta || product.precio_oferta ? parseFloat(product.precioOferta || product.precio_oferta) : undefined,
          onOffer: !!(product.precioOferta || product.precio_oferta),
          stock: parseInt(product.stock) || 0,
          minStock: parseInt(product.stockMinimo || product.stock_minimo) || 0,
          isActive: !!product.activo,
          isFeatured: !!product.destacado,
          weight: product.peso ? parseFloat(product.peso) : undefined,
          dimensions: safeJsonParse(product.dimensiones),
          tags: Array.isArray(product.etiquetas) ? product.etiquetas : safeJsonParse(product.etiquetas) || [],
          barcode: product.codigo_barras || undefined,
          sku: product.sku || undefined,
          slug: product.nombre ? product.nombre.toLowerCase().replace(/\s+/g, '-') : undefined,
          images: images,
          esServicio: Boolean(product.esServicio || product.es_servicio),
          es_servicio: Boolean(product.esServicio || product.es_servicio),
          category: product.categoria_nombre ? {
            id: product.categoria_id || product.categoriaId,
            name: product.categoria_nombre,
            slug: product.categoria_nombre ? product.categoria_nombre.toLowerCase().replace(/\s+/g, '-') : '',
            isActive: true,
            createdAt: product.fecha_creacion || product.createdAt || new Date().toISOString(),
            updatedAt: product.fecha_actualizacion || product.updatedAt || new Date().toISOString()
          } : (product.categoria ? {
            id: product.categoria.id,
            name: product.categoria.nombre || product.categoria.name,
            slug: product.categoria.slug || (product.categoria.nombre || product.categoria.name).toLowerCase().replace(/\s+/g, '-'),
            isActive: product.categoria.isActive !== undefined ? product.categoria.isActive : true,
            createdAt: product.categoria.createdAt || product.fecha_creacion || product.createdAt || new Date().toISOString(),
            updatedAt: product.categoria.updatedAt || product.fecha_actualizacion || product.updatedAt || new Date().toISOString()
          } : undefined),
          categoryId: product.categoria_id || product.categoriaId || undefined,
          fechaCreacion: product.fecha_creacion || product.createdAt || product.fechaCreacion,
          fechaActualizacion: product.fecha_actualizacion || product.updatedAt || product.fechaActualizacion,
          // Propiedades requeridas por Product (heredadas por AdminProduct)
          createdAt: product.createdAt || product.fecha_creacion || product.fechaCreacion || new Date().toISOString(),
          updatedAt: product.updatedAt || product.fecha_actualizacion || product.fechaActualizacion || new Date().toISOString(),
          // Propiedades opcionales de AdminProduct
        };
        
        
        return {
          success: true,
          data: mappedProduct,
          message: response.data.message
        }
      }
      
      console.warn('❌ AdminProductsService: Formato de respuesta inesperado:', {
        hasData: !!response.data,
        hasSuccess: !!response.data?.success,
        hasDataData: !!response.data?.data,
        hasProduct: !!response.data?.data?.product
      })
      throw new Error('Formato de respuesta inesperado')
    } catch (error) {
      console.error('❌ AdminProductsService: Error fetching product:', error)
      throw error
    }
  },

  // Verificar si un producto ya existe
  checkProductExists: async (sku?: string | number, CodVinculacion?: string | number) => {
    try {
      const params = new URLSearchParams()
      if (sku !== undefined) params.append('sku', String(sku))
      if (CodVinculacion !== undefined) params.append('CodVinculacion', String(CodVinculacion))
      
      const response = await api.get(`/products/check-exists?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('❌ Error checking product exists:', error)
      throw new Error('Error al verificar si el producto existe')
    }
  },

  // Crear un nuevo producto
  createProduct: async (data: CreateProductRequest) => {
    try {
      
      // Validar datos del producto
      validateProductData(data)
      
      // Mapear datos del frontend al formato del backend
      const codVinculacion = (data as { CodVinculacion?: string | number | null }).CodVinculacion ?? null
      const backendData = {
        nombre: data.title.trim(),
        descripcion: data.description || '',
        precio: data.price || 0,
        categoria_id: data.categoryId,
        stock: data.stock || 0,
        stock_minimo: 5,
        activo: data.isActive !== undefined ? data.isActive : true,
        destacado: data.isFeatured || false,
        esServicio: data.esServicio || false,
        es_servicio: data.esServicio || data.es_servicio || false,
        sku: data.sku || null, // ← AQUÍ se mapea el SKU
        CodVinculacion: codVinculacion, // ← AQUÍ se mapea el CodVinculacion
        etiquetas: data.tags && data.tags.length > 0 ? data.tags : [],
        imagenes: data.images || []
      };
      
      
      const response = await api.post('/products', backendData)
      
      return response.data
    } catch (error) {
      console.error('❌ Error creating product:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al crear el producto')
    }
  },

  // Actualizar un producto
  updateProduct: async (id: string, data: CreateProductRequest) => {
    try {
      
      // Validar que el ID existe
      if (!id || typeof id !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      // Validar datos del producto
      validateProductData(data)
      
      // Mapear datos del frontend al formato del backend
      const codVinculacion = (data as { CodVinculacion?: string | number | null }).CodVinculacion ?? null
      const backendData = {
        nombre: data.title || '',
        descripcion: data.description || '',
        precio: data.price || 0,
        categoria_id: data.categoryId,
        stock: data.stock || 0,
        stock_minimo: 5,
        activo: data.isActive !== undefined ? data.isActive : true,
        destacado: data.isFeatured || false,
        esServicio: data.esServicio !== undefined ? data.esServicio : false,
        es_servicio: data.esServicio !== undefined ? data.esServicio : (data.es_servicio !== undefined ? data.es_servicio : false),
        CodVinculacion: codVinculacion, // ← AQUÍ se mapea el CodVinculacion
        etiquetas: data.tags && data.tags.length > 0 ? data.tags : [],
        // Incluir imágenes solo si están presentes y son strings (URLs)
        // Si no hay imágenes nuevas, no enviar el campo para mantener las existentes
        ...(data.images && Array.isArray(data.images) && data.images.length > 0 
          ? { imagenes: data.images.filter(img => typeof img === 'string') }
          : {})
      };
      
      
      const response = await api.put(`/products/${id}`, backendData)
      
      // Invalidar cache para sincronización con móvil
      try {
        await api.post(`/products/invalidate-cache/${id}`)
      } catch (cacheError) {
        console.warn('⚠️ No se pudo invalidar cache:', cacheError)
      }
      
      return response.data
    } catch (error) {
      console.error('❌ Error updating product:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al actualizar el producto')
    }
  },

  // Eliminar un producto
  deleteProduct: async (id: string) => {
    try {
      const response = await api.delete(`/products/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  },

  // Subir imágenes de producto
  uploadProductImages: async (productId: string, files: FileList) => {
    try {
      
      // Validar que el ID existe
      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      // Validar que hay archivos
      if (!files || files.length === 0) {
        throw new Error('No se proporcionaron archivos de imagen')
      }
      
      const formData = new FormData()
      Array.from(files).forEach(file => {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          throw new Error(`El archivo ${file.name} no es una imagen válida`)
        }
        formData.append('images', file)
      })
      
      console.warn(`📤 Subiendo ${files.length} imagen(es)...`)
      
      const response = await api.post(`/products/${productId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      return response.data
    } catch (error) {
      console.error('❌ Error uploading product images:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al subir las imágenes')
    }
  },

  // Eliminar imagen de producto
  deleteProductImage: async (productId: string, imageIndex: number) => {
    try {
      
      // Validar parámetros
      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      if (typeof imageIndex !== 'number' || imageIndex < 0) {
        throw new Error('Índice de imagen inválido')
      }
      
      const response = await api.delete(`/products/${productId}/images/${imageIndex}`)
      
      return response.data
    } catch (error) {
      console.error('❌ Error deleting product image:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al eliminar la imagen')
    }
  },

  // Actualizar metadatos de imagen
  updateImageMetadata: async (productId: string, imageId: string, metadata: {
    alt_text?: string
    orden?: number
    esPrincipal?: boolean
  }) => {
    try {
      
      // Validar parámetros
      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      if (!imageId || typeof imageId !== 'string') {
        throw new Error('ID de imagen inválido')
      }
      
      const response = await api.patch(`/products/${productId}/images/${imageId}`, metadata)
      
      return response.data
    } catch (error) {
      console.error('❌ Error updating image metadata:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al actualizar metadatos de imagen')
    }
  },

  // Reordenar imágenes
  reorderImages: async (productId: string, imageIds: string[]) => {
    try {
      
      // Validar parámetros
      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      if (!Array.isArray(imageIds)) {
        throw new Error('Lista de IDs de imagen inválida')
      }
      
      const response = await api.patch(`/products/${productId}/images/reorder`, {
        imageIds
      })
      
      return response.data
    } catch (error) {
      console.error('❌ Error reordering images:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al reordenar imágenes')
    }
  },

  // Marcar imagen como principal
  setMainImage: async (productId: string, imageId: string) => {
    try {
      console.warn('⭐ AdminProductsService: Marcando imagen como principal:', imageId, 'del producto:', productId)
      
      // Validar parámetros
      if (!productId || typeof productId !== 'string') {
        throw new Error('ID de producto inválido')
      }
      
      if (!imageId || typeof imageId !== 'string') {
        throw new Error('ID de imagen inválido')
      }
      
      const response = await api.patch(`/products/${productId}/images/${imageId}/main`, {})
      
      return response.data
    } catch (error) {
      console.error('❌ Error setting main image:', error)
      
      // Mejorar el manejo de errores
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      }
      throw new Error('Error desconocido al marcar imagen como principal')
    }
  },

  // Obtener estadísticas de productos
  getProductStats: async () => {
    try {
      const response = await api.get('/products/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching product stats:', error)
      throw error
    }
  },
}

export default AdminProductsService

