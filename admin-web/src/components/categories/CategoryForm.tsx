'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminCategoriesService, AdminCategory } from '@/lib/admin-categories'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface CategoryFormProps {
  category?: AdminCategory
  onSuccess?: () => void
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    isActive: category?.isActive ?? true,
    image: category?.image || '',
    sortOrder: category?.sortOrder || 0,
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Funciones para manejar imagen
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      // Convertir a base64 para simular subida (en producción usarías un servicio real)
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Error al subir la imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const generateSlug = (name: string) => {
    return AdminCategoriesService.generateSlug(name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validaciones básicas
      if (!formData.name.trim()) {
        setError('El nombre de la categoría es obligatorio')
        return
      }

      console.log('🔍 Guardando categoría:', formData)

      // Crear categoría
      const categoryData: AdminCategory = {
        name: formData.name,
        description: formData.description,
        slug: generateSlug(formData.name),
        isActive: formData.isActive,
        image: formData.image,
        sortOrder: formData.sortOrder
      }

      console.log('🔍 Datos de la categoría:', categoryData)

      let response
      if (category && category.id) {
        // Actualizar categoría existente
        response = await AdminCategoriesService.updateCategory(category.id, categoryData)
      } else {
        // Crear nueva categoría
        response = await AdminCategoriesService.createCategory(categoryData)
      }

      console.log('✅ Respuesta:', response)

      if (response) {
        console.log('✅ Categoría guardada exitosamente')
        const message = category && category.id ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente'
        alert(message)
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/dashboard/categories')
        }
      } else {
        setError('Error al guardar la categoría')
      }
    } catch (error: any) {
      console.error('❌ Error al guardar categoría:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar la categoría'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {category ? 'Editar Categoría' : 'Agregar Nueva Categoría'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ej: Electrónicos, Ropa, Hogar"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción de la categoría"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700">
                    Orden de Visualización
                  </label>
                  <input
                    type="number"
                    id="sortOrder"
                    name="sortOrder"
                    min="0"
                    value={formData.sortOrder}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Categoría activa
                  </label>
                </div>
              </div>
            </div>

            {/* Sección de Imagen */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Imagen de la Categoría</h3>
              
              {/* Input para subir imagen */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Subiendo...' : 'Agregar Imagen'}
                </button>
                <p className="mt-1 text-sm text-gray-500">
                  Selecciona una imagen para la categoría
                </p>
              </div>

              {/* Preview de imagen */}
              {formData.image ? (
                <div className="relative inline-block">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>No hay imagen seleccionada</p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/categories')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : (category ? 'Actualizar Categoría' : 'Crear Categoría')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
