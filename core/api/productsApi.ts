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
  peso?: number;
  dimensiones?: any;
  etiquetas?: string[];
  codigoBarras?: string;
  sku?: string;
  imagenes?: ProductImage[];
  images?: string[]; // Compatibilidad con frontend
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
  precioMin?: number;
  precioMax?: number;
  destacado?: boolean;
  activo?: boolean;
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
  orderBy?: 'fecha_creacion' | 'nombre' | 'precio' | 'stock';
  orderDir?: 'ASC' | 'DESC';
}

// Helper para transformar imágenes del backend al formato del frontend
export const transformProductImages = (product: Product): Product => {
  if (product.imagenes && Array.isArray(product.imagenes)) {
    product.images = product.imagenes.map(img => {
      // Manejar tanto la nueva estructura como la anterior
      return img.url || img.urlImagen || img.url_imagen || '';
    }).filter(url => url !== '');
  } else {
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