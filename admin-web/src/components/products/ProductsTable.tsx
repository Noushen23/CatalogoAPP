'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminProductsService, AdminProduct } from '@/lib/admin-products'
import { RefreshIcon, PlusIcon, PencilIcon, TrashIcon, ExclamationTriangleIcon } from '@/components/icons'
import { EyeIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { ProductSearchBar } from './ProductSearchBar'
import { Pagination } from './Pagination'
import { QuickImageManager } from './QuickImageManager'


interface ProductsTableProps {
  filters?: {
    category: string
    stock: string
  }
}

export function ProductsTable({ filters }: ProductsTableProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [deleteProduct, setDeleteProduct] = useState<AdminProduct | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Resetear a la primera página cuando cambien los filtros externos
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const { data: productsResponse, isLoading, refetch } = useQuery({
    queryKey: ['admin-products', debouncedSearchTerm, sortBy, filters, currentPage, itemsPerPage],
    queryFn: async () => {
      
      try {
        // Mapear sortBy del frontend al backend
        const sortMap: Record<string, string> = {
          'title': 'nombre',
          'title_desc': 'nombre_desc',
          'price': 'precio_asc',
          'price_desc': 'precio_desc',
          'stock': 'stock_asc',
          'stock_desc': 'stock_desc',
          'created': 'recientes',
          'created_desc': 'recientes'
        }
        
        const backendSortBy = sortMap[sortBy] || 'recientes'
        
        // Preparar filtros para el backend
        const backendFilters: any = {
          search: debouncedSearchTerm || undefined,
          page: currentPage,
          limit: itemsPerPage,
          sortBy: backendSortBy
        }
        
        console.log(' ProductsTable - Enviando filtros:', backendFilters)
        
        // Mapear filtros: category -> categoriaId
        if (filters?.category && filters.category !== 'all') {
          backendFilters.categoriaId = filters.category
        }
        
        // Manejar filtro de stock
        if (filters?.stock && filters.stock !== 'all') {
          backendFilters.stockFilter = filters.stock
        }

        const response = await AdminProductsService.getProducts(backendFilters)
        
        return response
      } catch (error) {
        console.error(' ProductsTable: Error al obtener productos:', error)
        throw error
      }
    },
  })

  const products = productsResponse?.data || []
  const pagination = productsResponse?.pagination

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Sin Existencia', color: 'text-red-600' }
    if (stock < 10) return { text: 'Existencia Baja', color: 'text-yellow-600' }
    return { text: 'En Stock', color: 'text-green-600' }
  }

  const handleViewProduct = (product: AdminProduct) => {
    router.push(`/dashboard/products/detail/${product.id}`)
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

  // Funciones de manejo de búsqueda y filtros
  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
  }

  // Funciones de paginación
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset a la primera página
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
    <div className="space-y-6">
      {/* Barra de búsqueda mejorada */}
      <ProductSearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onSortChange={handleSortChange}
        sortBy={sortBy}
        totalResults={products?.length || 0}
      />

      {/* Tabla de productos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Productos ({products?.length || 0})
            </h3>
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información Adicional
                </th> */}
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
                    <td className="px-2 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center mr-2">
                          <span className="text-base font-medium text-blue-400">
                            {(product.title || product.slug || 'P').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {product.title || 'Sin título'}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU: {product.sku || product.slug || 'N/A'}
                            {product.barcode && (
                              <> | <span className="text-gray-400">Cód: {product.barcode}</span></>
                            )}
                            {product.isFeatured && (
                              <> <span className="text-yellow-600">⭐</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <QuickImageManager
                        productId={product.id}
                        images={product.images || []}
                        compact={true}
                        onImagesChange={(images) => {
                          queryClient.setQueryData(['admin-products'], (oldData: any) => {
                            if (!oldData) return oldData
                            return oldData.map((p: AdminProduct) => 
                              p.id === product.id ? { ...p, images } : p
                            )
                          })
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.onOffer && product.priceOffer ? (
                        <span>
                          <span className="font-medium text-green-600">${product.priceOffer.toFixed(2)}</span>
                          <span className="text-xs text-gray-400 line-through ml-1">${product.price.toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="font-medium">${product.price.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.stock}</div>
                      <div className={`text-xs ${stockStatus.color}`}>{stockStatus.text}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category?.name || '-'}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {product.dimensions && (
                        <>Dim: {
                          typeof product.dimensions === 'object'
                            ? `${product.dimensions.largo || 'N/A'}x${product.dimensions.ancho || 'N/A'}x${product.dimensions.alto || 'N/A'}cm`
                            : product.dimensions
                        }{' '}</>
                      )}
                      {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                        <>| Tags: {product.tags.slice(0, 2).join(', ')}{product.tags.length > 2 && ` +${product.tags.length - 2}`}</>
                      )}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewProduct(product)}
                          className="text-blue-600 hover:text-blue-900" 
                          title="Ver"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
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
      </div>

      {/* Paginación */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

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
