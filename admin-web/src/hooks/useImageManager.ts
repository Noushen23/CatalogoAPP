import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminProductsService } from '@/lib/admin-products'
import { ProductImage } from '@/types'
import { getImageUrl } from '@/lib/config'

interface UseImageManagerProps {
  productId: string
  initialImages?: ProductImage[]
  onImagesChange?: (images: ProductImage[]) => void
}

export function useImageManager({ 
  productId, 
  initialImages = [], 
  onImagesChange 
}: UseImageManagerProps) {
  const queryClient = useQueryClient()
  const [images, setImages] = useState<ProductImage[]>(initialImages)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState('')

  // Actualizar imágenes cuando cambien las iniciales
  useEffect(() => {
    setImages(initialImages)
  }, [initialImages])

  // Subir imágenes
  const uploadImages = useCallback(async (files: FileList) => {
    setError('')
    setUploadingImages(true)
    
    try {
      console.warn(`📸 Subiendo ${files.length} imagen(es) para producto ${productId}`)
      
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
      setImages(updatedImages)
      onImagesChange?.(updatedImages)
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      
      return updatedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al subir las imágenes'
      console.error('❌ Error al subir imágenes:', error)
      setError(errorMessage)
      throw error
    } finally {
      setUploadingImages(false)
    }
  }, [productId, images, onImagesChange, queryClient])

  // Eliminar imagen (por índice en el array local)
  const deleteImage = useCallback(async (imageIndex: number) => {
    setError('')
    
    try {
      
      // En el backend la ruta usa el índice de la imagen, no el ID
      await AdminProductsService.deleteProductImage(productId, imageIndex)
      
      const updatedImages = images.filter((_, index) => index !== imageIndex)
      // Reordenar las imágenes restantes
      const reorderedImages = updatedImages.map((img, index) => ({
        ...img,
        orden: index
      }))
      
      setImages(reorderedImages)
      onImagesChange?.(reorderedImages)
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      
      return reorderedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la imagen'
      console.error('❌ Error al eliminar imagen:', error)
      setError(errorMessage)
      throw error
    }
  }, [productId, images, onImagesChange, queryClient])

  // Marcar como imagen principal
  const setMainImage = useCallback((imageIndex: number) => {
    setError('')
    
    try {
      const updatedImages = images.map((img, index) => ({
        ...img,
        esPrincipal: index === imageIndex
      }))
      
      setImages(updatedImages)
      onImagesChange?.(updatedImages)
      
      return updatedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar imagen principal'
      console.error('❌ Error al actualizar imagen principal:', error)
      setError(errorMessage)
      throw error
    }
  }, [images, onImagesChange])

  // Reordenar imágenes
  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    try {
      const updatedImages = [...images]
      const [movedImage] = updatedImages.splice(fromIndex, 1)
      
      // Si el índice origen no es válido, no hacemos cambios
      if (!movedImage) {
        return images
      }

      updatedImages.splice(toIndex, 0, movedImage)
      
      // Actualizar orden
      const reorderedImages = updatedImages.map((img, index) => ({
        ...img,
        orden: index
      }))
      
      setImages(reorderedImages)
      onImagesChange?.(reorderedImages)
      
      return reorderedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al reordenar imágenes'
      console.error('❌ Error al reordenar imágenes:', error)
      setError(errorMessage)
      throw error
    }
  }, [images, onImagesChange])

  // Actualizar metadatos de imagen
  const updateImageMetadata = useCallback((imageId: string, updates: Partial<ProductImage>) => {
    try {
      const updatedImages = images.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      )
      
      setImages(updatedImages)
      onImagesChange?.(updatedImages)
      
      return updatedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar metadatos'
      console.error('❌ Error al actualizar metadatos:', error)
      setError(errorMessage)
      throw error
    }
  }, [images, onImagesChange])

  // Limpiar error
  const clearError = useCallback(() => {
    setError('')
  }, [])

  // Obtener imagen principal
  const getMainImage = useCallback(() => {
    return images.find(img => img.esPrincipal) || images[0] || null
  }, [images])

  // Obtener imágenes secundarias
  const getSecondaryImages = useCallback(() => {
    return images.filter(img => !img.esPrincipal)
  }, [images])

  return {
    // Estado
    images,
    uploadingImages,
    error,
    
    // Acciones
    uploadImages,
    deleteImage,
    setMainImage,
    reorderImages,
    updateImageMetadata,
    clearError,
    
    // Utilidades
    getMainImage,
    getSecondaryImages,
    
    // Estado derivado
    hasImages: images.length > 0,
    imageCount: images.length,
    mainImage: getMainImage(),
    secondaryImages: getSecondaryImages()
  }
}
