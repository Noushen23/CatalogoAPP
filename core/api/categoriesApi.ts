import { apiClient, ApiResponse } from './apiClient';

// Interfaces para categorías
export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  activa: boolean;
  orden: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CategoryFilters {
  activa?: boolean;
  limit?: number;
}

export interface CreateCategoryRequest {
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  orden?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  activa?: boolean;
}

export interface CategoryProductsResponse {
  category: Category;
  products: any[]; // Productos de la categoría
}

export interface ReorderCategoriesRequest {
  categoryOrders: Array<{
    id: string;
    orden: number;
  }>;
}

// Servicios de categorías
export const categoriesApi = {
  // Obtener todas las categorías
  async getCategories(filters: CategoryFilters = {}): Promise<ApiResponse<{ categories: Category[] }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '';
    
    return await apiClient.get<{ categories: Category[] }>(`/categories${url}`);
  },

  // Obtener categoría por ID
  async getCategoryById(id: string): Promise<ApiResponse<{ category: Category }>> {
    return await apiClient.get<{ category: Category }>(`/categories/${id}`);
  },

  // Obtener productos de una categoría
  async getCategoryProducts(
    id: string, 
    filters: { activo?: boolean; destacado?: boolean; limit?: number } = {}
  ): Promise<ApiResponse<CategoryProductsResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '';
    
    return await apiClient.get<CategoryProductsResponse>(`/categories/${id}/products${url}`);
  },

  // Crear categoría (requiere autenticación de admin)
  async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<{ category: Category }>> {
    return await apiClient.post<{ category: Category }>('/categories', data);
  },

  // Actualizar categoría (requiere autenticación de admin)
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<ApiResponse<{ category: Category }>> {
    return await apiClient.put<{ category: Category }>(`/categories/${id}`, data);
  },

  // Eliminar categoría (requiere autenticación de admin)
  async deleteCategory(id: string): Promise<ApiResponse> {
    return await apiClient.delete(`/categories/${id}`);
  },

  // Reordenar categorías (requiere autenticación de admin)
  async reorderCategories(data: ReorderCategoriesRequest): Promise<ApiResponse> {
    return await apiClient.patch('/categories/reorder', data);
  }
};
