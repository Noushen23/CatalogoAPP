import { api } from './api'
import { Product, CreateProductRequest, ProductImage } from '@/types'

// Tipos básicos para el servicio de productos
export interface AdminProduct extends Product {
  isFeatured?: boolean
}

export interface ProductFilters {
  search?: string
  status?: string
  category?: string
  price?: string
  stock?: string
  page?: number
  limit?: number
}

// Servicio básico de productos para el admin
export const AdminProductsService = {
  // Obtener todos los productos con filtros
  getProducts: async (filters?: ProductFilters) => {
    try {
      console.log('🔍 AdminProductsService: Obteniendo productos...')
      const response = await api.get('/products', { params: filters })
      console.log('📋 AdminProductsService: Respuesta completa:', response.data)
      
      // Mapear la respuesta del backend al formato esperado por el admin
      if (response.data && response.data.success && response.data.data && response.data.data.products) {
        console.log(`📊 AdminProductsService: Procesando ${response.data.data.products.length} productos`)
        
        const mappedProducts = response.data.data.products.map((product: any) => {
          // Función helper para parsear JSON de forma segura
          const safeJsonParse = (str: any) => {
            if (!str) return null;
            try {
              return typeof str === 'string' ? JSON.parse(str) : str;
            } catch (e) {
              console.warn('Error parseando JSON:', str);
              return null;
            }
          };
          
          // Procesar imágenes del producto
          let images: ProductImage[] = [];
          if (Array.isArray(product.imagenes) && product.imagenes.length > 0) {
            images = product.imagenes.map((img: any) => {
              // Si es un objeto con la nueva estructura
              if (typeof img === 'object' && img !== null) {
                return {
                  id: img.id || '',
                  url: img.url || img.urlImagen || img.url_imagen || '',
                  urlImagen: img.urlImagen || img.url_imagen || img.url || '',
                  url_imagen: img.url_imagen || img.urlImagen || img.url || '',
                  orden: img.orden || 0,
                  alt_text: img.alt_text || ''
                };
              }
              // Si es string (compatibilidad con estructura anterior)
              if (typeof img === 'string') {
                const baseUrl = 'http://192.168.3.104:3001';
                const fullUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
                return {
                  id: `legacy-${Date.now()}-${Math.random()}`,
                  url: fullUrl,
                  urlImagen: fullUrl,
                  url_imagen: fullUrl,
                  orden: 0,
                  alt_text: ''
                };
              }
              return null;
            }).filter((img): img is ProductImage => img !== null);
          }
          
          return {
            id: product.id,
            title: product.nombre || product.title || 'Producto sin nombre', // Backend usa 'nombre'
            description: product.descripcion || product.description || '',
            price: parseFloat(product.precio) || 0,
            priceOffer: product.precio_oferta ? parseFloat(product.precio_oferta) : null,
            onOffer: !!product.precio_oferta,
            stock: parseInt(product.stock) || 0,
            minStock: parseInt(product.stockMinimo || product.stock_minimo) || 0,
            isActive: !!product.activo,
            isFeatured: !!product.destacado,
            weight: product.peso ? parseFloat(product.peso) : null,
            dimensions: safeJsonParse(product.dimensiones),
            tags: Array.isArray(product.etiquetas) ? product.etiquetas : safeJsonParse(product.etiquetas) || [],
            barcode: product.codigo_barras || null,
            sku: product.sku || null,
            slug: product.nombre ? product.nombre.toLowerCase().replace(/\s+/g, '-') : null,
            images: images,
            // Mapear categoría desde el backend (categoriaNombre)
            category: product.categoriaNombre || product.categoria_nombre ? {
              id: product.categoria_id || product.categoriaId,
              name: product.categoriaNombre || product.categoria_nombre
            } : (product.categoria ? {
              id: product.categoria.id,
              name: product.categoria.nombre || product.categoria.name
            } : null),
            categoryId: product.categoria_id || product.categoriaId,
            createdAt: product.fecha_creacion || product.createdAt,
            updatedAt: product.fecha_actualizacion || product.updatedAt,
          };
        });
        
        console.log(`✅ AdminProductsService: ${mappedProducts.length} productos mapeados exitosamente`)
        console.log('📋 Ejemplo de producto mapeado:', mappedProducts[0])
        
        return {
          success: true,
          data: mappedProducts,
          message: response.data.message
        }
      }
      
      console.log('❌ AdminProductsService: Formato de respuesta inesperado:', {
        hasData: !!response.data,
        hasSuccess: !!response.data?.success,
        hasDataData: !!response.data?.data,
        hasProducts: !!response.data?.data?.products
      })
      return { success: false, data: [], message: 'Formato de respuesta inesperado' }
    } catch (error) {
      console.error('❌ AdminProductsService: Error fetching products:', error)
      throw error
    }
  },

  // Obtener un producto por ID
  getProduct: async (id: string) => {
    try {
      console.log('🔍 AdminProductsService: Obteniendo producto por ID:', id)
      const response = await api.get(`/products/${id}`)
      console.log('📋 AdminProductsService: Respuesta completa:', response.data)
      
      // Mapear la respuesta del backend al formato esperado por el admin
      if (response.data && response.data.success && response.data.data && response.data.data.product) {
        const product = response.data.data.product;
        console.log('📊 AdminProductsService: Procesando producto:', product)
        
        // Función helper para parsear JSON de forma segura
        const safeJsonParse = (str: any) => {
          if (!str) return null;
          try {
            return typeof str === 'string' ? JSON.parse(str) : str;
          } catch (e) {
            console.warn('Error parseando JSON:', str);
            return null;
          }
        };
        
        // Procesar imágenes del producto
        let images: ProductImage[] = [];
        if (Array.isArray(product.imagenes) && product.imagenes.length > 0) {
          images = product.imagenes.map((img: any) => {
            // Si es un objeto con la nueva estructura
            if (typeof img === 'object' && img !== null) {
              return {
                id: img.id || '',
                url: img.url || '',
                orden: img.orden || 0,
                alt_text: img.alt_text || ''
              };
            }
            // Si es string (compatibilidad con estructura anterior)
            if (typeof img === 'string') {
              const baseUrl = 'http://192.168.3.104:3001';
              const fullUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
              return {
                id: `legacy-${Date.now()}-${Math.random()}`,
                url: fullUrl,
                orden: 0,
                alt_text: ''
              };
            }
            return null;
          }).filter((img): img is ProductImage => img !== null);
        }
        
        const mappedProduct = {
          id: product.id,
          title: product.nombre || product.title || 'Producto sin nombre', // Backend usa 'nombre'
          description: product.descripcion || product.description || '',
          price: parseFloat(product.precio) || 0,
          priceOffer: product.precioOferta || product.precio_oferta ? parseFloat(product.precioOferta || product.precio_oferta) : null,
          onOffer: !!(product.precioOferta || product.precio_oferta),
          stock: parseInt(product.stock) || 0,
          minStock: parseInt(product.stockMinimo || product.stock_minimo) || 0,
          isActive: !!product.activo,
          isFeatured: !!product.destacado,
          weight: product.peso ? parseFloat(product.peso) : null,
          dimensions: safeJsonParse(product.dimensiones),
          tags: Array.isArray(product.etiquetas) ? product.etiquetas : safeJsonParse(product.etiquetas) || [],
          barcode: product.codigo_barras || null,
          sku: product.sku || null,
          slug: product.nombre ? product.nombre.toLowerCase().replace(/\s+/g, '-') : null,
          images: images,
          category: product.categoria_nombre ? {
            id: product.categoria_id || product.categoriaId,
            name: product.categoria_nombre
          } : (product.categoria ? {
            id: product.categoria.id,
            name: product.categoria.nombre || product.categoria.name
          } : null),
          categoryId: product.categoriaId || product.categoria_id || product.categoryId,
          createdAt: product.fecha_creacion || product.createdAt,
          updatedAt: product.fecha_actualizacion || product.updatedAt,
        };
        
        console.log('✅ AdminProductsService: Producto mapeado exitosamente:', mappedProduct)
        
        return {
          success: true,
          data: mappedProduct,
          message: response.data.message
        }
      }
      
      console.log('❌ AdminProductsService: Formato de respuesta inesperado:', {
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

  // Crear un nuevo producto
  createProduct: async (data: CreateProductRequest) => {
    try {
      // Mapear datos del frontend al formato del backend
      const backendData = {
        nombre: data.title,
        descripcion: data.description,
        precio: data.price,
        categoria_id: data.categoryId && data.categoryId !== '' ? data.categoryId : null,
        stock: data.stock || 0,
        stock_minimo: 5,
        activo: data.isActive !== undefined ? data.isActive : true,
        destacado: data.isFeatured || false,
        etiquetas: data.tags && data.tags.length > 0 ? data.tags : [],
        imagenes: data.images || []
      };
      
      const response = await api.post('/products', backendData)
      return response.data
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  // Actualizar un producto
  updateProduct: async (id: string, data: CreateProductRequest) => {
    try {
      console.log('📝 AdminProductsService: Actualizando producto:', id)
      console.log('📋 Datos a enviar:', data)
      
      // Mapear datos del frontend al formato del backend
      const backendData = {
        nombre: data.title,
        descripcion: data.description,
        precio: data.price,
        categoria_id: data.categoryId || null,
        stock: data.stock || 0,
        stock_minimo: 5,
        activo: data.isActive !== undefined ? data.isActive : true,
        destacado: data.isFeatured || false,
        etiquetas: data.tags && data.tags.length > 0 ? data.tags : []
        // No incluimos imágenes aquí, se manejan por separado
      };
      
      console.log('📤 Datos mapeados para backend:', backendData)
      
      const response = await api.put(`/products/${id}`, backendData)
      console.log('✅ Producto actualizado:', response.data)
      
      return response.data
    } catch (error) {
      console.error('❌ Error updating product:', error)
      throw error
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
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('images', file)
      })
      
      const response = await api.post(`/products/${productId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      console.error('Error uploading product images:', error)
      throw error
    }
  },

  // Eliminar imagen de producto
  deleteProductImage: async (productId: string, imageId: string) => {
    try {
      const response = await api.delete(`/products/${productId}/images/${imageId}`)
      return response.data
    } catch (error) {
      console.error('Error deleting product image:', error)
      throw error
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

