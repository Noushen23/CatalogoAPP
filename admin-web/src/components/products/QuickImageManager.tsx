'use client'

import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminProductsService } from '@/lib/admin-products'
import { ProductImage } from '@/types'
import { 
  PhotoIcon, 
  TrashIcon, 
  StarIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface QuickImageManagerProps {
  productId: string
  images: ProductImage[]
  onImagesChange?: (images: ProductImage[]) => void
  compact?: boolean
}

export function QuickImageManager({ 
  productId, 
  images = [], 
  onImagesChange,
  compact = false
}: QuickImageManagerProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState('')
  const [showAllImages, setShowAllImages] = useState(false)

  // Subir nuevas imágenes
  const handleImageUpload = async (files: FileList) => {
    setError('')
    setUploadingImages(true)
    
    try {
      
      const response = await AdminProductsService.uploadProductImages(productId, files)
      
      // Construir URLs completas
      // 192.168.3.6: Servidor local (API principal)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.6:3001'
      const newImages: ProductImage[] = (response.data || []).map((url: string, index: number) => ({
        id: `upload-${Date.now()}-${index}`,
        url: url.startsWith('http') ? url : `${baseUrl}${url}`,
        orden: images.length + index,
        alt_text: '',
        esPrincipal: false
      }))

      const updatedImages = [...images, ...newImages]
      onImagesChange?.(updatedImages)
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      
    } catch (error: any) {
      console.error('❌ Error al subir imágenes:', error)
      setError(error.message || 'Error al subir las imágenes')
    } finally {
      setUploadingImages(false)
    }
  }

  // Eliminar imagen
  const handleDeleteImage = async (imageId: string, imageIndex: number) => {
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return
    }

    setError('')
    try {
      
      // Verificar que el índice sea válido
      if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= images.length) {
        throw new Error('Índice de imagen inválido')
      }
      
      // Si el imageId es un ID temporal, solo eliminar del estado local
      if (imageId.startsWith('upload-') || imageId.startsWith('legacy-') || imageId.startsWith('base64-')) {
        const updatedImages = images.filter((_, index) => index !== imageIndex)
        const reorderedImages = updatedImages.map((img, index) => ({
          ...img,
          orden: index
        }))
        onImagesChange?.(reorderedImages)
        return
      }
      
      // Para imágenes reales del backend, hacer la llamada API usando el índice
      await AdminProductsService.deleteProductImage(productId, imageIndex)
      
      const updatedImages = images.filter((_, index) => index !== imageIndex)
      // Reordenar las imágenes restantes
      const reorderedImages = updatedImages.map((img, index) => ({
        ...img,
        orden: index
      }))
      
      onImagesChange?.(reorderedImages)
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      
    } catch (error: any) {
      console.error('❌ Error al eliminar imagen:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setError(error.message || 'Error al eliminar la imagen')
    }
  }

  // Marcar como imagen principal
  const handleSetMainImage = async (imageIndex: number) => {
    setError('')
    try {
      const updatedImages = images.map((img, index) => ({
        ...img,
        esPrincipal: index === imageIndex
      }))
      
      onImagesChange?.(updatedImages)
      
    } catch (error: any) {
      console.error('❌ Error al actualizar imagen principal:', error)
      setError(error.message || 'Error al actualizar imagen principal')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleImageUpload(files)
    }
    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayImages = compact && !showAllImages ? images.slice(0, 3) : images
  const hasMoreImages = compact && images.length > 3

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Vista compacta */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
          {displayImages.map((image, index) => {
            // Validar que la imagen tenga una URL válida
            if (!image.url || image.url.trim() === '') {
              return null
            }
            
            return (
              <div key={image.id} className="relative">
                <img
                  src={image.url}
                  alt={image.alt_text || `Imagen ${index + 1}`}
                  className="h-8 w-8 rounded-full object-cover border-2 border-white"
                  onError={(e) => {
                    console.error('Error cargando imagen:', image.url)
                    e.currentTarget.style.display = 'none'
                  }}
                />
                {image.esPrincipal && (
                  <div className="absolute -top-1 -right-1">
                    <StarIconSolid className="h-3 w-3 text-yellow-500" />
                  </div>
                )}
              </div>
            )
          })}
            {hasMoreImages && (
              <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                +{images.length - 3}
              </div>
            )}
          </div>
          
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Subir imágenes"
            >
              <PhotoIcon className="h-4 w-4" />
            </button>
            
            {hasMoreImages && (
              <button
                type="button"
                onClick={() => setShowAllImages(!showAllImages)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title={showAllImages ? "Ver menos" : "Ver todas"}
              >
                {showAllImages ? (
                  <XMarkIcon className="h-4 w-4" />
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Vista expandida */}
        {showAllImages && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => {
              // Validar que la imagen tenga una URL válida
              if (!image.url || image.url.trim() === '') {
                return null
              }
              
              return (
                <div key={image.id} className="relative group">
                  <img
                    src={image.url}
                    alt={image.alt_text || `Imagen ${index + 1}`}
                    className="h-16 w-16 object-cover rounded border"
                    onError={(e) => {
                      console.error('Error cargando imagen:', image.url)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  
                  {/* Overlay con controles */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(index)}
                        className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                        title={image.esPrincipal ? 'Imagen principal' : 'Marcar como principal'}
                      >
                        {image.esPrincipal ? (
                          <StarIconSolid className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-3 w-3 text-gray-600" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image.id, index)}
                        className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                        title="Eliminar imagen"
                      >
                        <TrashIcon className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Indicador de imagen principal */}
                  {image.esPrincipal && (
                    <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded-bl">
                      P
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Mensaje de error */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>
    )
  }

  // Vista completa (no compacta)
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <PhotoIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {images.length} imagen{images.length !== 1 ? 'es' : ''}
          </span>
        </div>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImages}
          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <PhotoIcon className="h-3 w-3 mr-1" />
          {uploadingImages ? 'Subiendo...' : 'Subir'}
        </button>
      </div>

      {/* Grid de imágenes */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => {
            // Validar que la imagen tenga una URL válida
            if (!image.url || image.url.trim() === '') {
              return null
            }
            
            return (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt={image.alt_text || `Imagen ${index + 1}`}
                  className="w-full h-20 object-cover rounded border"
                  onError={(e) => {
                    console.error('Error cargando imagen:', image.url)
                    e.currentTarget.style.display = 'none'
                  }}
                />
                
                {/* Overlay con controles */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded">
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleSetMainImage(index)}
                      className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                      title={image.esPrincipal ? 'Imagen principal' : 'Marcar como principal'}
                    >
                      {image.esPrincipal ? (
                        <StarIconSolid className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <StarIcon className="h-3 w-3 text-gray-600" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image.id, index)}
                      className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                      title="Eliminar imagen"
                    >
                      <TrashIcon className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Indicador de imagen principal */}
                {image.esPrincipal && (
                  <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                    P
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded">
          <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-1 text-xs text-gray-500">Sin imágenes</p>
        </div>
      )}

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Mensaje de error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
