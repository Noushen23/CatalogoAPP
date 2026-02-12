'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { AdminProductsService } from '@/lib/admin-products'
import { ProductImage } from '@/types'
import { getImageUrl } from '@/lib/config'
import { 
  PhotoIcon, 
  TrashIcon, 
  PencilIcon, 
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface ImageManagerProps {
  productId: string
  images: ProductImage[]
  onImagesChange?: (images: ProductImage[]) => void
  maxImages?: number
  className?: string
}

interface EditingImage {
  id: string
  alt_text: string
  orden: number
}

export function ImageManager({ 
  productId, 
  images = [], 
  onImagesChange,
  maxImages = 10,
  className = ''
}: ImageManagerProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadingImages, setUploadingImages] = useState(false)
  const [editingImage, setEditingImage] = useState<EditingImage | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (Array.isArray(images)) {
      // Las imágenes se manejan directamente a través de onImagesChange
    }
  }, [images])

  // Validar archivos de imagen
  const validateImageFiles = useCallback((files: FileList): string[] => {
    const errors: string[] = []
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    
    Array.from(files).forEach((file, index) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`Archivo ${index + 1}: Solo se permiten imágenes JPG, PNG, WebP o GIF`)
      }
      if (file.size > maxSize) {
        errors.push(`Archivo ${index + 1}: El tamaño máximo es 5MB`)
      }
    })
    
    if (files.length + images.length > maxImages) {
      errors.push(`Máximo ${maxImages} imágenes por producto`)
    }
    
    return errors
  }, [images.length, maxImages])

  // Subir nuevas imágenes
  const handleImageUpload = useCallback(async (files: FileList) => {
    setError('')
    
    // Validar archivos
    const validationErrors = validateImageFiles(files)
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '))
      return
    }

    setUploadingImages(true)
    try {
      
      const response = await AdminProductsService.uploadProductImages(productId, files)
      
      // Construir URLs completas usando configuración centralizada
      const newImages: ProductImage[] = (response.data || []).map((url: string, index: number) => ({
        id: `upload-${Date.now()}-${index}`,
        url: getImageUrl(url),
        orden: images.length + index,
        alt_text: '',
        esPrincipal: false
      }))

      const updatedImages = [...images, ...newImages]
      onImagesChange?.(updatedImages)
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al subir las imágenes'
      setError(errorMessage)
    } finally {
      setUploadingImages(false)
    }
  }, [productId, images, onImagesChange, queryClient, validateImageFiles])

  // Eliminar imagen
  const handleDeleteImage = useCallback(async (imageId: string, imageIndex: number) => {
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return
    }

    setError('')
    try {
      
      // Verificar que el índice sea válido
      if (typeof imageIndex !== 'number' || imageIndex < 0 || imageIndex >= images.length) {
        throw new Error('Índice de imagen inválido')
      }
      
      // Si el imageId es un ID temporal (como los generados para nuevas imágenes), 
      // solo eliminar del estado local sin llamar al backend
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
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la imagen'
      setError(errorMessage)
    }
  }, [productId, images, onImagesChange, queryClient])

  // Marcar como imagen principal
  const handleSetMainImage = useCallback(async (imageIndex: number) => {
    setError('')
    try {
      const updatedImages = images.map((img, index) => ({
        ...img,
        esPrincipal: index === imageIndex
      }))
      
      onImagesChange?.(updatedImages)
      
      // Aquí podrías hacer una llamada al backend para actualizar la imagen principal
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar imagen principal'
      setError(errorMessage)
    }
  }, [images, onImagesChange])

  // Reordenar imágenes
  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    const updatedImages = [...images]
    const [movedImage] = updatedImages.splice(fromIndex, 1)
    if (movedImage) {
      updatedImages.splice(toIndex, 0, movedImage)
    }
    
    // Actualizar orden
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      orden: index
    }))
    
    onImagesChange?.(reorderedImages)
  }, [images, onImagesChange])

  // Editar metadatos de imagen
  const handleEditImage = (image: ProductImage, index: number) => {
    setEditingImage({
      id: image.id,
      alt_text: image.alt_text || '',
      orden: image.orden || index
    })
  }

  const handleSaveEdit = () => {
    if (!editingImage) return
    
    const updatedImages = images.map(img => 
      img.id === editingImage.id 
        ? { ...img, alt_text: editingImage.alt_text }
        : img
    )
    
    onImagesChange?.(updatedImages)
    setEditingImage(null)
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== dropIndex) {
      handleReorderImages(dragIndex, dropIndex)
    }
    setDragIndex(null)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header con botón de subir */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Imágenes del Producto</h3>
          <p className="text-sm text-gray-500">
            {images.length} de {maxImages} imágenes
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImages || images.length >= maxImages}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PhotoIcon className="h-4 w-4 mr-2" />
            {uploadingImages ? 'Subiendo...' : 'Subir Imágenes'}
          </button>
        </div>
      </div>

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
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

       {/* Grid de imágenes */}
       {images.length > 0 ? (
         <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
           {images.map((image, index) => {
             // Validar que la imagen tenga una URL válida
             if (!image.url || image.url.trim() === '') {
               return null
             }
             
             return (
               <div
                 key={image.id}
                 draggable
                 onDragStart={(e) => handleDragStart(e, index)}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDrop(e, index)}
                 className={`relative group bg-gray-100 rounded-lg overflow-hidden ${
                   dragIndex === index ? 'opacity-50' : ''
                 } ${image.esPrincipal ? 'ring-2 ring-yellow-400' : ''}`}
               >
                 {/* Imagen */}
                <Image
                  src={image.url}
                  alt={image.alt_text || `Imagen ${index + 1}`}
                  width={320}
                  height={128}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                  className="w-full h-32 object-cover"
                  unoptimized
                  onError={(e) => {
                    console.error('Error cargando imagen:', image.url)
                    // Ocultar la imagen si falla al cargar
                    e.currentTarget.style.display = 'none'
                  }}
                />

                 {/* Overlay con controles */}
                 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <div className="flex space-x-2">
                     {/* Botón imagen principal */}
                     <button
                       type="button"
                       onClick={() => handleSetMainImage(index)}
                       className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                       title={image.esPrincipal ? 'Imagen principal' : 'Marcar como principal'}
                     >
                       {image.esPrincipal ? (
                         <StarIconSolid className="h-4 w-4 text-yellow-500" />
                       ) : (
                         <StarIcon className="h-4 w-4 text-gray-600" />
                       )}
                     </button>

                     {/* Botón editar */}
                     <button
                       type="button"
                       onClick={() => handleEditImage(image, index)}
                       className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                       title="Editar metadatos"
                     >
                       <PencilIcon className="h-4 w-4 text-gray-600" />
                     </button>

                     {/* Botón eliminar */}
                     <button
                       type="button"
                       onClick={() => handleDeleteImage(image.id, index)}
                       className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                       title="Eliminar imagen"
                     >
                       <TrashIcon className="h-4 w-4 text-red-600" />
                     </button>
                   </div>
                 </div>

                 {/* Indicador de imagen principal */}
                 {image.esPrincipal && (
                   <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                     Principal
                   </div>
                 )}

                 {/* Controles de reordenamiento */}
                 <div className="absolute top-2 right-2 flex flex-col space-y-1">
                   {index > 0 && (
                     <button
                       type="button"
                       onClick={() => handleReorderImages(index, index - 1)}
                       className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                       title="Mover arriba"
                     >
                       <ArrowUpIcon className="h-3 w-3 text-gray-600" />
                     </button>
                   )}
                   {index < images.length - 1 && (
                     <button
                       type="button"
                       onClick={() => handleReorderImages(index, index + 1)}
                       className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                       title="Mover abajo"
                     >
                       <ArrowDownIcon className="h-3 w-3 text-gray-600" />
                     </button>
                   )}
                 </div>

                 {/* Texto alternativo */}
                 {image.alt_text && (
                   <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 truncate">
                     {image.alt_text}
                   </div>
                 )}
               </div>
             )
           })}
         </div>
       ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay imágenes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Sube imágenes para mostrar el producto
          </p>
        </div>
      )}

      {/* Modal de edición */}
      {editingImage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Metadatos de Imagen
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Texto Alternativo
                  </label>
                  <input
                    type="text"
                    value={editingImage.alt_text}
                    onChange={(e) => setEditingImage(prev => 
                      prev ? { ...prev, alt_text: e.target.value } : null
                    )}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe la imagen para accesibilidad"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingImage(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CheckIcon className="h-4 w-4 mr-2 inline" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
