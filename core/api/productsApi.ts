import { apiClient, ApiResponse, PaginationData } from './apiClient';

// Interfaces para productos
export interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precioOferta?: number;
  precioFinal: number;
  enOferta: boolean;
  categoriaId?: string;
  categoriaNombre?: string;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  activo: boolean;
  destacado: boolean;
  esServicio?: boolean; // Indica si el producto es un servicio
  es_servicio?: boolean; // Alias para compatibilidad
  peso?: number;
  dimensiones?: any;
  etiquetas?: string[];
  codigoBarras?: string;
  sku?: string;
  ventasTotales?: number;
  calificacionPromedio?: number;
  totalResenas?: number;
  imagenes?: ProductImage[];
  images?: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ProductImage {
  id: string;
  url?: string;
  url_imagen?: string;
  orden?: number;
  alt_text?: string;
  // Campos legacy para compatibilidad
  productoId?: string;
  urlImagen?: string;
  esPrincipal?: boolean;
  es_principal?: boolean;
  fechaCreacion?: string;
  fecha_creacion?: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  categoriaId?: string;
  busqueda?: string;
  search?: string;
  precioMin?: number;
  precioMax?: number;
  calificacionMin?: number;
  enOferta?: boolean;
  destacado?: boolean;
  activo?: boolean;
  esServicio?: boolean; // Nuevo filtro para servicios
  es_servicio?: boolean; // Alias alternativo
  sortBy?: 'recientes' | 'precio_asc' | 'precio_desc' | 'ventas' | 'calificacion' | 'nombre';
  orderBy?: 'fecha_creacion' | 'nombre' | 'precio' | 'stock';
  orderDir?: 'ASC' | 'DESC';
}

export interface ProductSearchParams {
  q: string;
  page?: number;
  limit?: number;
  categoriaId?: string;
  precioMin?: number;
  precioMax?: number;
  calificacionMin?: number;
  enOferta?: boolean;
  esServicio?: boolean; // Nuevo filtro para servicios
  es_servicio?: boolean; // Alias alternativo
  sortBy?: 'recientes' | 'precio_asc' | 'precio_desc' | 'ventas' | 'calificacion' | 'nombre';
  orderBy?: 'fecha_creacion' | 'nombre' | 'precio' | 'stock';
  orderDir?: 'ASC' | 'DESC';
}

// Helper para validar URLs de imágenes
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') return false;
  
  try {
    new URL(trimmedUrl);
    return true;
  } catch {
    return false;
  }
};

// Helper para transformar imágenes del backend al formato del frontend
export const transformProductImages = (product: Product): Product => {
  console.log('🔄 [transformProductImages] Producto recibido:', {
    id: product.id,
    nombre: product.nombre,
    imagenesCount: product.imagenes?.length || 0,
    imagenesType: Array.isArray(product.imagenes) ? 'array' : typeof product.imagenes,
    imagenesSample: product.imagenes?.[0],
    imagesCount: product.images?.length || 0
  });

  // Inicializar images como array vacío
  product.images = [];

  if (product.imagenes && Array.isArray(product.imagenes) && product.imagenes.length > 0) {
    console.log(`📸 [transformProductImages] Procesando ${product.imagenes.length} imagen(es)...`);
    
    product.images = product.imagenes.map((img, index) => {
      // Manejar tanto la nueva estructura como la anterior
      // El backend devuelve objetos con: url, urlImagen, url_imagen (todos con la misma URL completa)
      const imageUrl = img.url || img.urlImagen || img.url_imagen || '';
      
      console.log(`  📸 [transformProductImages] Imagen ${index + 1}/${product.imagenes.length}:`, {
        id: img.id,
        url: img.url,
        urlImagen: img.urlImagen,
        url_imagen: img.url_imagen,
        finalUrl: imageUrl,
        tipo: typeof img,
        esObjeto: typeof img === 'object',
        isValid: isValidImageUrl(imageUrl)
      });
      
      // Validar URL antes de incluirla
      if (isValidImageUrl(imageUrl)) {
        const trimmedUrl = imageUrl.trim();
        console.log(`  ✅ [transformProductImages] Imagen ${index + 1} válida:`, trimmedUrl);
        return trimmedUrl;
      }
      
      console.warn(`  ⚠️ [transformProductImages] URL de imagen ${index + 1} inválida filtrada:`, imageUrl);
      return null;
    }).filter((url): url is string => url !== null && url !== ''); // Filtrar URLs inválidas
    
    console.log('✅ [transformProductImages] Transformación completada:', {
      productoId: product.id,
      totalRecibidas: product.imagenes.length,
      totalValidas: product.images.length,
      totalFiltradas: product.imagenes.length - product.images.length,
      urlsFinales: product.images
    });
  } else {
    console.warn('⚠️ [transformProductImages] No hay imágenes para transformar:', {
      productoId: product.id,
      tieneImagenes: !!product.imagenes,
      esArray: Array.isArray(product.imagenes),
      longitud: product.imagenes?.length || 0
    });
    product.images = [];
  }
  
  return product;
};

export interface CreateProductRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  precioOferta?: number;
  categoriaId?: string;
  stock?: number;
  stockMinimo?: number;
  peso?: number;
  dimensiones?: any;
  etiquetas?: string[];
  codigoBarras?: string;
  sku?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  activo?: boolean;
  destacado?: boolean;
}

export interface UpdateStockRequest {
  cantidad: number;
  operacion?: 'suma' | 'resta';
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationData;
}

export interface ProductResponse {
  product: Product;
  images?: ProductImage[];
}

export interface SearchResponse extends ProductsResponse {
  searchTerm: string;
}

// Servicios de productos
export const productsApi = {
  // Obtener todos los productos
  async getProducts(filters: ProductFilters = {}): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '';
    
    const response = await apiClient.get<ProductsResponse>(`/products${url}`);
    
    if (response.success && response.data) {
      // Transformar imágenes para cada producto
      response.data.products = response.data.products.map(transformProductImages);
    }
    
    return response;
  },

  // Obtener producto por ID
  async getProductById(id: string): Promise<ApiResponse<ProductResponse>> {
    const response = await apiClient.get<ProductResponse>(`/products/${id}`);
    
    if (response.success && response.data) {
      // Transformar imágenes del producto
      response.data.product = transformProductImages(response.data.product);
    }
    
    return response;
  },

  // Buscar productos
  async searchProducts(params: ProductSearchParams): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const response = await apiClient.get<SearchResponse>(`/products/search?${queryString}`);
    
    if (response.success && response.data) {
      // Transformar imágenes para cada producto
      response.data.products = response.data.products.map(transformProductImages);
    }
    
    return response;
  },

  // Obtener productos destacados
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<{ products: Product[] }>> {
    const response = await apiClient.get<{ products: Product[] }>(`/products/featured?limit=${limit}`);
    
    if (response.success && response.data) {
      // Transformar imágenes para cada producto
      response.data.products = response.data.products.map(transformProductImages);
    }
    
    return response;
  },

  // Crear producto (requiere autenticación)
  async createProduct(data: CreateProductRequest): Promise<ApiResponse<ProductResponse>> {
    return await apiClient.post<ProductResponse>('/products', data);
  },

  // Actualizar producto (requiere autenticación)
  async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<ProductResponse>> {
    return await apiClient.put<ProductResponse>(`/products/${id}`, data);
  },

  // Eliminar producto (requiere autenticación)
  async deleteProduct(id: string): Promise<ApiResponse> {
    return await apiClient.delete(`/products/${id}`);
  },

  // Actualizar stock (requiere autenticación)
  async updateStock(id: string, data: UpdateStockRequest): Promise<ApiResponse<ProductResponse>> {
    return await apiClient.patch<ProductResponse>(`/products/${id}/stock`, data);
  },

  // Obtener productos por categoría
  async getProductsByCategory(categoryId: string, filters: Omit<ProductFilters, 'categoriaId'> = {}): Promise<ApiResponse<ProductsResponse>> {
    const params = new URLSearchParams();
    params.append('categoriaId', categoryId);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const response = await apiClient.get<ProductsResponse>(`/products?${queryString}`);
    
    if (response.success && response.data) {
      // Transformar imágenes para cada producto
      response.data.products = response.data.products.map(transformProductImages);
    }
    
    return response;
  }
};