'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminProductsService, AdminProduct } from '@/lib/admin-products'
import { RefreshIcon, SpinnerIcon, PlusIcon, PhotoIcon, PencilIcon, TrashIcon, ExclamationTriangleIcon } from '@/components/icons'
import { useRouter } from 'next/navigation'

interface ProductsTableProps {
  filters?: {
    category: string
    price: string
    stock: string
  }
}

export function ProductsTable({ filters }: ProductsTableProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteProduct, setDeleteProduct] = useState<AdminProduct | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<{ [productId: string]: boolean }>({})

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['admin-products', searchTerm, statusFilter, filters],
    queryFn: async (): Promise<AdminProduct[]> => {
      console.log('🔍 ProductsTable: Obteniendo productos del sistema administrativo...')
      
      try {
        const response = await AdminProductsService.getProducts()
        
        console.log('📋 ProductsTable: Respuesta recibida:', response)
        
        // El servicio ya mapea la respuesta correctamente
        let productsList: AdminProduct[] = []
        if (response && response.success && Array.isArray(response.data)) {
          productsList = response.data
        } else if (Array.isArray(response)) {
          productsList = response
        }

        console.log(`📊 ProductsTable: ${productsList.length} productos recibidos`)

        if (productsList.length > 0) {
          let filtered = productsList

          // Aplicar filtro de búsqueda
          if (searchTerm) {
            filtered = filtered.filter((product: AdminProduct) =>
              (product.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (product.slug || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
          }

          // Aplicar filtro de estado
          if (statusFilter === 'active') {
            filtered = filtered.filter((product: AdminProduct) => product.isActive)
          } else if (statusFilter === 'inactive') {
            filtered = filtered.filter((product: AdminProduct) => !product.isActive)
          }

          // Aplicar filtros adicionales
          if (filters) {
            if (filters.category !== 'all') {
              filtered = filtered.filter((product: AdminProduct) => product.categoryId === filters.category)
            }

            if (filters.price !== 'all') {
              filtered = filtered.filter((product: AdminProduct) => {
                const price = product.price
                switch (filters.price) {
                  case 'lt100':
                    return price < 100
                  case '100-500':
                    return price >= 100 && price <= 500
                  case '500-1000':
                    return price >= 500 && price <= 1000
                  case 'gt1000':
                    return price > 1000
                  default:
                    return true
                }
              })
            }

            if (filters.stock !== 'all') {
              filtered = filtered.filter((product: AdminProduct) => {
                const stock = product.stock
                switch (filters.stock) {
                  case 'in_stock':
                    return stock > 10
                  case 'low_stock':
                    return stock > 0 && stock <= 10
                  case 'out_of_stock':
                    return stock === 0
                  default:
                    return true
                }
              })
            }
          }

          console.log(`✅ ProductsTable: ${filtered.length} productos filtrados`)
          return filtered
        }
        
        console.log('⚠️ ProductsTable: No hay productos disponibles')
        return []
      } catch (error) {
        console.error('❌ ProductsTable: Error al obtener productos:', error)
        return []
      }
    },
  })

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Sin Existencia', color: 'text-red-600' }
    if (stock < 10) return { text: 'Existencia Baja', color: 'text-yellow-600' }
    return { text: 'En Stock', color: 'text-green-600' }
  }

  const handleEditProduct = (product: AdminProduct) => {
    router.push(`/dashboard/products/edit/${product.id}`)
  }

  const handleDeleteProduct = (product: AdminProduct) => {
    setDeleteProduct(product)
  }

  const confirmDelete = async () => {
    if (!deleteProduct) return

    setIsDeleting(true)
    try {
      await AdminProductsService.deleteProduct(deleteProduct.id!)
      
      // Actualizar la lista de productos
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      
      setDeleteProduct(null)
    } catch (error) {
      console.error('Error al eliminar producto:', error)
      alert('Error al eliminar el producto')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteProduct(null)
  }

  const handleAddImage = (productId: string) => {
    // Crear un input de archivo dinámicamente
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        await uploadImages(productId, Array.from(files))
      }
    }
    
    input.click()
  }

  const uploadImages = async (productId: string, files: File[]) => {
    try {
      setUploadingImages(prev => ({ ...prev, [productId]: true }))
      console.log(`📸 Subiendo ${files.length} imagen(es) para producto ${productId}`)
      
      // Convertir File[] a FileList
      const fileList = {
        ...files,
        item: (index: number) => files[index] || null,
        length: files.length
      } as FileList
      
      // Usar el servicio real para subir imágenes
      await AdminProductsService.uploadProductImages(productId, fileList)
      
      // Actualizar la lista de productos
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      
      console.log('✅ Imágenes subidas exitosamente')
    } catch (error) {
      console.error('❌ Error al subir imágenes:', error)
      alert('Error al subir las imágenes')
    } finally {
      setUploadingImages(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      try {
        console.log(`🗑️ Eliminando imagen ${imageId} del producto ${productId}`)
        
        // Usar el servicio real para eliminar la imagen
        await AdminProductsService.deleteProductImage(productId, imageId)
        
        // Actualizar la lista de productos
        queryClient.invalidateQueries({ queryKey: ['admin-products'] })
        
        console.log('✅ Imagen eliminada exitosamente')
      } catch (error) {
        console.error('❌ Error al eliminar imagen:', error)
        alert('Error al eliminar la imagen')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por código, descripción o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshIcon 
                  size={16} 
                  className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imágenes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información Adicional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products?.map((product) => {
                const stockStatus = getStockStatus(product.stock)
                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {(product.title || product.slug || 'P').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.title || 'Producto sin título'}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku || product.slug || 'Sin SKU'}
                          </div>
                          {product.barcode && (
                            <div className="text-xs text-gray-400">
                              Código: {product.barcode}
                            </div>
                          )}
                          {product.isFeatured && (
                            <div className="text-xs text-yellow-600 font-medium">
                              ⭐ Destacado
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        {product.images && product.images.length > 0 ? (
                          <>
                            <div className="flex space-x-1">
                              {product.images.slice(0, 3).map((image, index) => {
                                // Extraer URL válida de la imagen
                                const imageUrl = typeof image === 'string' 
                                  ? image 
                                  : image?.url || image?.urlImagen || image?.url_imagen;
                                
                                // Si no hay URL válida, no renderizar la imagen
                                if (!imageUrl || imageUrl.trim() === '') {
                                  return null;
                                }
                                
                                return (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`${product.title || 'Producto'} - Imagen ${index + 1}`}
                                      className="h-12 w-12 rounded-md object-cover border border-gray-200"
                                      onError={(e) => {
                                        console.error('Error cargando imagen:', imageUrl);
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAyMEgxNFYyNEgxOFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTMwIDI4SDIyVjMySDMwVjI4WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMjBIMjZWMjRIMzBWMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                      }}
                                    />
                                    {index === 2 && product.images.length > 3 && (
                                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                          +{product.images.length - 3}
                                        </span>
                                      </div>
                                    )}
                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleDeleteImage(product.id, typeof image === 'string' ? `${index}` : image.id)}
                                        className="h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        title="Eliminar imagen"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              <button
                                onClick={() => handleAddImage(product.id)}
                                disabled={uploadingImages[product.id]}
                                className="h-12 w-12 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={uploadingImages[product.id] ? "Subiendo imágenes..." : "Agregar imagen"}
                              >
                                {uploadingImages[product.id] ? (
                                  <SpinnerIcon size={20} className="animate-spin" />
                                ) : (
                                  <PlusIcon size={20} />
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.images.length} imagen{product.images.length !== 1 ? 'es' : ''}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center space-y-2">
                            <button
                              onClick={() => handleAddImage(product.id)}
                              disabled={uploadingImages[product.id]}
                              className="h-12 w-12 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={uploadingImages[product.id] ? "Subiendo imágenes..." : "Agregar imagen"}
                            >
                              {uploadingImages[product.id] ? (
                                <SpinnerIcon size={24} className="animate-spin" />
                              ) : (
                                <PhotoIcon size={24} />
                              )}
                            </button>
                            <span className="text-xs text-gray-400">Sin imágenes</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        {product.onOffer && product.priceOffer ? (
                          <>
                            <span className="font-medium text-green-600">${product.priceOffer.toFixed(2)}</span>
                            <span className="text-xs text-gray-500 line-through">
                              ${product.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              ¡En Oferta!
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">${product.price.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.stock}</div>
                      <div className={`text-xs ${stockStatus.color}`}>
                        {stockStatus.text}
                      </div>
                      {product.minStock && (
                        <div className="text-xs text-gray-400">
                          Mín: {product.minStock}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category?.name || 'Sin categoría'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {product.weight && (
                          <div className="text-xs text-gray-600">
                            Peso: {product.weight} kg
                          </div>
                        )}
                        {product.dimensions && (
                          <div className="text-xs text-gray-600">
                            Dim: {
                              typeof product.dimensions === 'object' 
                                ? `${product.dimensions.largo || 'N/A'} x ${product.dimensions.ancho || 'N/A'} x ${product.dimensions.alto || 'N/A'} cm`
                                : product.dimensions
                            }
                          </div>
                        )}
                        {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                          <div className="text-xs text-gray-600">
                            Tags: {product.tags.slice(0, 2).join(', ')}
                            {product.tags.length > 2 && ` +${product.tags.length - 2} más`}
                          </div>
                        )}
                        {product.createdAt && (
                          <div className="text-xs text-gray-400">
                            Creado: {new Date(product.createdAt).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        {product.isFeatured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Destacado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="text-indigo-600 hover:text-indigo-900" 
                          title="Editar"
                        >
                          <PencilIcon size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-900" 
                          title="Eliminar"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {products?.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <PlusIcon size={48} />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primer producto para tu tienda.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard/products/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon size={16} className="mr-2" />
                Crear Producto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon size={24} className="text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar eliminación de producto
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">
                ¿Estás seguro de que quieres eliminar el producto <strong>"{deleteProduct.title}"</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
