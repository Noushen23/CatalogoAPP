'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminProductsService, AdminProduct } from '@/lib/admin-products'
import { AdminCategoriesService } from '@/lib/admin-categories'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreateProductRequest, ProductImage } from '@/types'
import { ImageManager } from './ImageManager'

interface ProductFormProps {
  product?: AdminProduct
  onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    images: product?.images || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured || false,
    tags: product?.tags || [],
    categoryId: product?.categoryId || '',
    esServicio: product?.esServicio || product?.es_servicio || false,
  })

  // Actualizar formData cuando el producto cambie (para modo edición)
  React.useEffect(() => {
    if (product) {
      
      const newFormData = {
        title: product.title || '',
        description: product.description || '',
        price: product.price || 0,
        stock: product.stock || 0,
        images: product.images || [],
        isActive: product.isActive ?? true,
        isFeatured: product.isFeatured || false,
        tags: product.tags || [],
        categoryId: product.categoryId || '',
        esServicio: product.esServicio || product.es_servicio || false,
      }
      
      setFormData(newFormData)
    }
  }, [product])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Consulta de categorías
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: AdminCategoriesService.getCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    const isCheckbox = type === 'checkbox'
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false
    
    // Si se marca "Es servicio", desmarcar automáticamente "Producto destacado"
    if (name === 'esServicio' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        isFeatured: false // Desmarcar automáticamente producto destacado
      }))
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : isCheckbox ? checked : value
    }))
  }

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    setFormData(prev => ({
      ...prev,
      tags
    }))
  }

  // Funciones para manejar imágenes
  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true)
    try {
      if (product) {
        // Si estamos editando un producto, subir las imágenes directamente al servidor
        const formData = new FormData()
        Array.from(files).forEach(file => {
          formData.append('images', file)
        })
        
        const response = await AdminProductsService.uploadProductImages(product.id, files)
        
        // Actualizar el estado con las nuevas URLs de imagen
        const newImageUrls = response.data || []
        // Construir URLs completas para las nuevas imágenes
        // 192.168.3.6: Servidor local (API principal)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.6:3001'
        const fullImageUrls = newImageUrls.map((url: string) => 
          url.startsWith('http') ? url : `${baseUrl}${url}`
        )
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...fullImageUrls.map((url: string, index: number) => ({
            id: `upload-${Date.now()}-${index}`,
            url,
            orden: prev.images.length + index,
            alt_text: ''
          }))]
        }))
        
        // Mostrar mensaje de éxito
        
        // Refrescar la lista de productos para mostrar los cambios
        queryClient.invalidateQueries({ queryKey: ['admin-products'] })
        queryClient.invalidateQueries({ queryKey: ['admin-product', product.id] })
        
      } else {
        // Si estamos creando un nuevo producto, convertir a base64
        const imagePromises = Array.from(files).map(async (file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve(e.target?.result as string)
            }
            reader.readAsDataURL(file)
          })
        })

        const newImages = await Promise.all(imagePromises)
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages.map((url, index) => ({
            id: `base64-${Date.now()}-${index}`,
            url,
            orden: prev.images.length + index,
            alt_text: ''
          }))]
        }))
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      setError('Error al subir las imágenes')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = async (_imageId: string, index: number) => {
    try {
      if (product) {
        // Si estamos editando un producto, eliminar la imagen del servidor usando el índice
        await AdminProductsService.deleteProductImage(product.id, index.toString())
        
        // Refrescar la lista de productos para mostrar los cambios
        queryClient.invalidateQueries({ queryKey: ['admin-products'] })
        queryClient.invalidateQueries({ queryKey: ['admin-product', product.id] })
      }
      
      // Actualizar el estado local (tanto para edición como creación)
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }))
    } catch (error) {
      console.error('Error removing image:', error)
      setError('Error al eliminar la imagen')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleImageUpload(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validaciones básicas
      if (!formData.title.trim()) {
        setError('El nombre del producto es requerido')
        return
      }

      if (formData.price <= 0) {
        setError('El precio debe ser mayor a 0')
        return
      }

      // Crear slug automáticamente si no existe
      const slug = formData.title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim()

      const productData: CreateProductRequest = {
        ...formData,
        slug,
        gender: 'Unisex' as any, // Valor por defecto
        sizes: [] as any, // Array vacío por defecto
        esServicio: formData.esServicio || false,
        es_servicio: formData.esServicio || false, // Enviar ambos formatos para compatibilidad
        // Mantener categoryId como está
        // categoryId: formData.categoryId && formData.categoryId.trim() !== '' ? formData.categoryId : null,
        // Para edición: solo enviar URLs de imágenes existentes (no base64)
        // Para creación: enviar solo imágenes base64 (las nuevas)
        images: product?.id 
          ? formData.images
              .filter(img => typeof img === 'object' && img.url && !img.url.startsWith('data:'))
              .map(img => img.url!)
          : formData.images
              .filter(img => typeof img === 'object' && img.url && img.url.startsWith('data:'))
              .map(img => img.url!)
      }


      if (product?.id) {
        await AdminProductsService.updateProduct(product.id, productData)
      } else {
        await AdminProductsService.createProduct(productData)
      }

      // Invalidar queries para actualizar las listas
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['top-products'] })
      
      // Invalidar también el producto específico para refrescar imágenes
      if (product?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin-product', product.id] })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/products')
      }
    } catch (error: any) {
      console.error('❌ Error al guardar producto:', error)
      
      // Manejo de errores más detallado
      let errorMessage = 'Error al guardar el producto'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Mensajes específicos para diferentes tipos de errores
      if (errorMessage.includes('validation')) {
        errorMessage = 'Por favor verifica que todos los campos requeridos estén completos'
      } else if (errorMessage.includes('duplicate')) {
        errorMessage = 'Ya existe un producto con este nombre'
      } else if (errorMessage.includes('category')) {
        errorMessage = 'La categoría seleccionada no es válida'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Indicador de modo */}
      {product && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Modo Edición
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Editando producto: <strong>{product.title}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información básica */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Información Básica
        </h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Nombre del Producto *
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Precio *
            </label>
            <input
              type="number"
              name="price"
              id="price"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Stock
            </label>
            <input
              type="number"
              name="stock"
              id="stock"
              min="0"
              value={formData.stock}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              name="categoryId"
              id="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Seleccionar categoría</option>
              {categories?.data?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-6 flex-wrap">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                id="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Producto activo
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isFeatured"
                id="isFeatured"
                checked={formData.isFeatured || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                Producto destacado
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="esServicio"
                id="esServicio"
                checked={formData.esServicio || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="esServicio" className="ml-2 block text-sm text-gray-900">
                Es servicio (aparecerá solo en Recargas)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            Tags (separados por comas)
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            value={formData.tags.join(', ')}
            onChange={handleTagChange}
            placeholder="ej: deportivo, casual, verano"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-white shadow rounded-lg p-6">
        <ImageManager
          productId={product?.id || 'new'}
          images={formData.images as ProductImage[]}
          onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
          maxImages={10}
        />
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/products')}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : product ? 'Actualizar' : 'Crear'} Producto
        </button>
      </div>
    </form>
  )
}

