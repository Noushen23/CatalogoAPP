import { apiClient, ApiResponse } from './apiClient';
import { API_CONFIG } from '../config/api.config';

// Interfaces para favoritos
export interface Favorite {
  id: string;
  usuario_id: string;
  producto_id: string;
  fecha_agregado: string;
  producto?: {
    id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    precio_oferta?: number;
    precio_final: number;
    stock: number;
    activo: boolean;
    destacado: boolean;
    es_servicio?: boolean;
    esServicio?: boolean;
    categoria_nombre?: string;
    imagenes: Array<{
      id: string;
      url?: string;
      urlImagen?: string;
      url_imagen?: string;
      orden: number;
      alt_text?: string;
    }>;
    images?: string[]; // Array transformado de URLs
    etiquetas: string[];
  };
}

export interface FavoritesResponse {
  favorites: Favorite[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  stats: {
    total_favoritos: number;
    categorias_diferentes: number;
    precio_promedio: number;
    precio_minimo: number;
    precio_maximo: number;
  };
}

export interface FavoriteCheckResponse {
  product_id: string;
  is_favorite: boolean;
}

export interface FavoriteStats {
  total_favoritos: number;
  categorias_diferentes: number;
  precio_promedio: number;
  precio_minimo: number;
  precio_maximo: number;
}

export interface FavoritesQueryParams {
  page?: number;
  limit?: number;
  include_details?: boolean;
}

// Servicios de favoritos
export const favoritesApi = {
  // Obtener lista de favoritos del usuario
  async getFavorites(params: FavoritesQueryParams = {}): Promise<ApiResponse<FavoritesResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.include_details !== undefined) {
      queryParams.append('include_details', params.include_details.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/profile/favorites?${queryString}` : '/profile/favorites';
    
    const response = await apiClient.get<FavoritesResponse>(url);
    
    // Transformar imágenes de productos en favoritos
    if (response.success && response.data) {
      const baseUrl = await API_CONFIG.getResolvedApiBaseUrl();
      response.data.favorites = response.data.favorites.map(favorite => {
        if (favorite.producto && favorite.producto.imagenes) {
          favorite.producto.images = favorite.producto.imagenes.map(img => {
            // Priorizar 'url' que debería tener la URL completa del backend
            let url = img.url || img.urlImagen || img.url_imagen || '';
            
            // Si la URL es relativa, construir URL completa
            if (url && !url.startsWith('http')) {
              url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            }
            
            return url;
          }).filter(url => url !== '');
        }
        return favorite;
      });
    }
    
    return response;
  },

  // Añadir producto a favoritos
  async addFavorite(productId: string): Promise<ApiResponse<{ favorite: Favorite }>> {
    return await apiClient.post<{ favorite: Favorite }>('/profile/favorites', {
      producto_id: productId
    });
  },

  // Eliminar producto de favoritos
  async removeFavorite(productId: string): Promise<ApiResponse<{ removed_product_id: string }>> {
    return await apiClient.delete<{ removed_product_id: string }>(`/profile/favorites/${productId}`);
  },

  // Verificar si un producto está en favoritos
  async checkFavorite(productId: string): Promise<ApiResponse<FavoriteCheckResponse>> {
    return await apiClient.get<FavoriteCheckResponse>(`/profile/favorites/check/${productId}`);
  },

  // Obtener estadísticas de favoritos
  async getFavoriteStats(): Promise<ApiResponse<{ stats: FavoriteStats }>> {
    return await apiClient.get<{ stats: FavoriteStats }>('/profile/favorites/stats');
  },

  // Eliminar todos los favoritos del usuario
  async removeAllFavorites(): Promise<ApiResponse<{ deleted_count: number }>> {
    return await apiClient.delete<{ deleted_count: number }>('/profile/favorites');
  },

  // Obtener solo los IDs de productos favoritos (para verificación rápida)
  async getFavoriteProductIds(): Promise<ApiResponse<{ product_ids: string[] }>> {
    try {
      // Llamar directamente al endpoint de favoritos con parámetros mínimos
      const response = await apiClient.get<{ favorites: Array<{ producto_id: string }> }>('/profile/favorites');
      
      if (response.success && response.data) {
        const productIds = response.data.favorites.map(fav => fav.producto_id);
        return {
          success: true,
          message: 'Favoritos obtenidos exitosamente',
          data: { product_ids: productIds }
        };
      }
      
      return {
        success: false,
        message: 'Error al obtener favoritos'
      };
    } catch (error) {
      console.error('Error getting favorite product IDs:', error);
      
      // Si es un error de datos inválidos, devolver lista vacía en lugar de fallar
      if (error instanceof Error && error.message.includes('Datos de entrada inválidos')) {
        return {
          success: true,
          message: 'No hay favoritos disponibles',
          data: { product_ids: [] as string[] }
        };
      }
      
      return {
        success: false,
        message: 'Error al obtener favoritos'
      };
    }
  },

  // Verificar múltiples productos de una vez
  async checkMultipleFavorites(productIds: string[]): Promise<Record<string, boolean>> {
    try {
      // Obtener todos los IDs de favoritos
      const response = await this.getFavoriteProductIds();
      
      if (response.success && response.data) {
        const favoriteIds = response.data.product_ids;
        const result: Record<string, boolean> = {};
        
        // Crear un mapa de verificación
        productIds.forEach(productId => {
          result[productId] = favoriteIds.includes(productId);
        });
        
        return result;
      }
      
      // Si hay error, asumir que ningún producto es favorito
      const result: Record<string, boolean> = {};
      productIds.forEach(productId => {
        result[productId] = false;
      });
      
      return result;
    } catch (error) {
      console.error('Error checking multiple favorites:', error);
      
      // En caso de error, asumir que ningún producto es favorito
      const result: Record<string, boolean> = {};
      productIds.forEach(productId => {
        result[productId] = false;
      });
      
      return result;
    }
  }
};

// Helper para transformar favoritos al formato del frontend
export const transformFavorite = (favorite: Favorite): Favorite => {
  // Si ya tiene el formato correcto, devolverlo tal como está
  if (favorite.producto) {
    return favorite;
  }
  
  // Si no tiene detalles del producto, devolver solo la información básica
  return {
    id: favorite.id,
    usuario_id: favorite.usuario_id,
    producto_id: favorite.producto_id,
    fecha_agregado: favorite.fecha_agregado
  };
};

// Helper para verificar si un producto está en la lista de favoritos
export const isProductFavorite = (productId: string, favorites: Favorite[]): boolean => {
  return favorites.some(fav => fav.producto_id === productId);
};

// Helper para obtener el favorito de un producto específico
export const getProductFavorite = (productId: string, favorites: Favorite[]): Favorite | undefined => {
  return favorites.find(fav => fav.producto_id === productId);
};

