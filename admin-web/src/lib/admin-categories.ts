import { api } from './api'

export interface AdminCategory {
  id?: string
  name: string
  description?: string
  slug: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  // Campos adicionales
  parentId?: string
  image?: string
  sortOrder?: number
}

interface BackendCategory {
  id?: string
  nombre?: string
  descripcion?: string
  activa?: boolean
  imagenUrl?: string
  orden?: number
  fechaCreacion?: string
  fechaActualizacion?: string
}

export class AdminCategoriesService {
  // Obtener todas las categorías
  static async getCategories() {
    try {
      const response = await api.get('/categories')
      
      // Mapear respuesta del backend al formato del frontend
      if (response.data.success && response.data.data.categories) {
        const frontendCategories = response.data.data.categories.map((backendCategory: BackendCategory) => ({
          id: backendCategory.id,
          name: backendCategory.nombre,
          description: backendCategory.descripcion,
          slug: backendCategory.nombre?.toLowerCase().replace(/\s+/g, '-') || '',
          isActive: backendCategory.activa,
          image: backendCategory.imagenUrl,
          sortOrder: backendCategory.orden,
          createdAt: backendCategory.fechaCreacion,
          updatedAt: backendCategory.fechaActualizacion
        }))
        
        return {
          success: true,
          data: frontendCategories
        }
      }
      
      return response.data
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  }

  // Obtener una categoría por ID
  static async getCategory(id: string) {
    try {
      const response = await api.get(`/categories/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching category:', error)
      throw error
    }
  }

  // Crear categoría
  static async createCategory(category: AdminCategory) {
    try {
      // Mapear datos del frontend al formato del backend
      const backendCategory = {
        nombre: category.name,
        descripcion: category.description,
        imagenUrl: category.image,
        orden: category.sortOrder || 0,
        activa: category.isActive ?? true
      }

      console.warn('Guardando categoría:', backendCategory)
      
      const response = await api.post('/categories', backendCategory)
      return response.data
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  }

  // Actualizar categoría
  static async updateCategory(id: string, category: Partial<AdminCategory>) {
    try {
      // Mapear datos del frontend al formato del backend
      const backendCategory: Partial<BackendCategory> = {}
      
      if (category.name !== undefined) backendCategory.nombre = category.name
      if (category.description !== undefined) backendCategory.descripcion = category.description
      if (category.image !== undefined) backendCategory.imagenUrl = category.image
      if (category.sortOrder !== undefined) backendCategory.orden = category.sortOrder
      if (category.isActive !== undefined) backendCategory.activa = category.isActive

      const response = await api.put(`/categories/${id}`, backendCategory)
      return response.data
    } catch (error) {
      console.error('Error updating category:', error)
      throw error
    }
  }

  // Eliminar categoría
  static async deleteCategory(id: string) {
    try {
      const response = await api.delete(`/categories/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting category:', error)
      throw error
    }
  }

  // Generar slug a partir del nombre
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}
