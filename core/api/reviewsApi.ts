import { apiClient, ApiResponse } from './apiClient';

// Interfaces para reseñas
export interface Review {
  id: string;
  usuarioId: string;
  productoId: string;
  ordenId?: string;
  calificacion: number;
  comentario?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  usuario: {
    nombreCompleto: string;
    email?: string;
  };
  producto?: {
    nombre: string;
    imagenPrincipal?: string;
  };
  orden?: {
    numeroOrden: string;
  };
}

export interface ReviewSimple {
  id: string;
  calificacion: number;
  comentario?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  usuario: {
    nombreCompleto: string;
  };
}

export interface ReviewStats {
  totalResenas: number;
  promedioCalificacion: number;
  calificacionMinima: number;
  calificacionMaxima: number;
  distribucion: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewRequest {
  calificacion: number;
  comentario?: string;
  ordenId?: string;
}

export interface UpdateReviewRequest {
  calificacion?: number;
  comentario?: string;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface ReviewsResponse {
  reviews: ReviewSimple[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  stats: ReviewStats;
}

export interface CanReviewResponse {
  canReview: boolean;
  existingReview?: Review;
}

// Servicios de reseñas
export const reviewsApi = {
  // Obtener reseñas de un producto
  async getReviewsByProduct(productId: string, filters: ReviewFilters = {}): Promise<ApiResponse<ReviewsResponse>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.includeInactive) params.append('includeInactive', filters.includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/products/${productId}/reviews?${queryString}` : `/products/${productId}/reviews`;
    
    return await apiClient.get<ReviewsResponse>(url);
  },

  // Obtener estadísticas de reseñas de un producto
  async getProductReviewStats(productId: string, includeInactive = false): Promise<ApiResponse<ReviewStats>> {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/products/${productId}/reviews/stats?${queryString}` : `/products/${productId}/reviews/stats`;
    
    return await apiClient.get<ReviewStats>(url);
  },

  // Verificar si el usuario puede reseñar un producto
  async canUserReviewProduct(productId: string): Promise<ApiResponse<CanReviewResponse>> {
    return await apiClient.get<CanReviewResponse>(`/products/${productId}/reviews/can-review`);
  },

  // Crear una reseña
  async createReview(productId: string, data: CreateReviewRequest): Promise<ApiResponse<Review>> {
    return await apiClient.post<Review>(`/products/${productId}/reviews`, data);
  },

  // Obtener reseñas del usuario autenticado
  async getUserReviews(filters: ReviewFilters = {}): Promise<ApiResponse<{ reviews: Review[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.includeInactive) params.append('includeInactive', filters.includeInactive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/products/reviews/my-reviews?${queryString}` : `/products/reviews/my-reviews`;
    
    return await apiClient.get<{ reviews: Review[]; pagination: any }>(url);
  },

  // Actualizar una reseña
  async updateReview(reviewId: string, data: UpdateReviewRequest): Promise<ApiResponse<Review>> {
    return await apiClient.put<Review>(`/products/reviews/${reviewId}`, data);
  },

  // Eliminar una reseña
  async deleteReview(reviewId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return await apiClient.delete<{ success: boolean; message: string }>(`/products/reviews/${reviewId}`);
  },

  // Obtener una reseña específica
  async getReview(reviewId: string): Promise<ApiResponse<Review>> {
    return await apiClient.get<Review>(`/products/reviews/${reviewId}`);
  },
};