'use client'

import React, { useState, useEffect } from 'react'
import { useMaterialesTNS, useApimaterialConnection } from '@/hooks/useApimaterial'
import { useCreateProductFromApimaterialWithCategory } from '@/hooks/useCreateProductFromApimaterialWithCategory'
import { useCheckProductExists } from '@/hooks/useCheckProductExists'
import { MaterialTNS } from '@/lib/apimaterial-service'
import { RefreshCw, Database, AlertCircle, CheckCircle, Loader2, Plus, X, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { ApimaterialProductResult } from './ApimaterialProductNotification'

interface ApimaterialSelectorProps {
  onProductCreated?: (result: ApimaterialProductResult) => void
  onClose?: () => void
}

export default function ApimaterialSelector({ onProductCreated, onClose }: ApimaterialSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const itemsPerPage = 10
  const queryClient = useQueryClient()
  
  // Debounce para búsqueda automática
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset a página 1 al buscar
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Hooks
  const { data: connectionData } = useApimaterialConnection()
  const { data: materialesData, isLoading, refetch, error: fetchError } = useMaterialesTNS({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch,
    conPrecios: true,
  })
  const createProductMutation = useCreateProductFromApimaterialWithCategory()
  
  const isConnected = connectionData === true
  const materiales = materialesData?.data || []
  const totalPages = materialesData?.pagination?.totalPages || 1
  const totalItems = materialesData?.pagination?.total || 0
  
  // Manejar errores de fetch
  useEffect(() => {
    if (fetchError) {
      setError('Error al cargar materiales. Verifica la conexión con Apimaterial.')
    }
  }, [fetchError])
  
  const handleSearch = () => {
    if (searchTerm.trim().length >= 2) {
      setCurrentPage(1)
      refetch()
    }
  }
  
  const handleCreateProduct = async (material: MaterialTNS) => {
    setError(null)
    setSuccessMessage(null)
    
    try {
      
      const result = await createProductMutation.mutateAsync(material)
      
      if (result.success) {
        setSuccessMessage(`✅ Producto "${material.DESCRIP}" creado exitosamente`)
        
        // Invalidar cache adicional para asegurar actualización inmediata
        queryClient.invalidateQueries({
          queryKey: ['check-product-exists']
        })
        
        // Auto-cerrar mensaje de éxito después de 5 segundos
        setTimeout(() => setSuccessMessage(null), 5000)
        
        if (onProductCreated) {
          onProductCreated(result)
        }
      } else {
        console.error('❌ Error creando producto:', result)
        
        // Manejar diferentes tipos de errores
        if (result.existingProduct) {
          // Producto ya existe
          const errorMessage = `⚠️ El producto "${material.DESCRIP}" ya existe con ${result.duplicateField}: ${result.duplicateValue}`
          setError(errorMessage)
        } else {
          // Otros errores
          const errorMessage = result.message || 'Error al crear el producto'
          setError(errorMessage)
        }
        
        if (onProductCreated) {
          onProductCreated(result)
        }
      }
    } catch (error) {
      console.error('❌ Error en handleCreateProduct:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear producto'
      setError(errorMessage)
      
      const errorResult = {
        success: false,
        message: errorMessage,
        material: material
      }
      if (onProductCreated) {
        onProductCreated(errorResult)
      }
    }
  }
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }
  
  const handleRefresh = () => {
    setError(null)
    setSuccessMessage(null)
    refetch()
  }
  
  const formatPrice = (price: number | undefined) => {
    if (!price || price === 0) return 'Sin precio'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price)
  }
  
  const getStatusColor = (inactivo: string) => {
    return inactivo === 'S' ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
  }
  
  const getStatusText = (inactivo: string) => {
    return inactivo === 'S' ? 'Inactivo' : 'Activo'
  }

  // Componente para mostrar el estado de existencia del producto
  const ProductExistenceStatus = ({ material }: { material: MaterialTNS }) => {
    const { data: existenceData, isLoading: checkingExistence, refetch } = useCheckProductExists({
      sku: material.CODIGO,
      CodVinculacion: material.MATID.toString()
    })

    // Refetch automático cuando cambia el estado de creación
    const { isSuccess } = createProductMutation
    useEffect(() => {
      if (isSuccess) {
        refetch()
      }
    }, [isSuccess, refetch])

    if (checkingExistence) {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Verificando...</span>
        </div>
      )
    }

    if (existenceData?.exists) {
      return (
        <div className="flex items-center space-x-1 text-yellow-600">
          <Info className="h-3 w-3" />
          <span className="text-xs">Ya existe como producto</span>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-1 text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">Disponible para crear</span>
      </div>
    )
  }

  // Componente para el botón de crear producto con estado de existencia
  const ProductExistenceButton = ({ material }: { material: MaterialTNS }) => {
    const { data: existenceData, isLoading: checkingExistence, refetch } = useCheckProductExists({
      sku: material.CODIGO,
      CodVinculacion: material.MATID.toString()
    })

    // Refetch automático cuando cambia el estado de creación
    const { isSuccess } = createProductMutation
    useEffect(() => {
      if (isSuccess) {
        refetch()
      }
    }, [isSuccess, refetch])

    const isDisabled = createProductMutation.isPending || checkingExistence || existenceData?.exists

    if (existenceData?.exists) {
      return (
        <button
          disabled
          className="flex items-center space-x-1 px-3 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
          title="Este producto ya existe en el sistema"
        >
          <Info className="h-4 w-4" />
          <span>Ya Existe</span>
        </button>
      )
    }

    return (
      <button
        onClick={() => handleCreateProduct(material)}
        disabled={isDisabled}
        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {createProductMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span>Crear Producto</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Crear Producto</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Connection Status */}
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            isConnected ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {isConnected ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado a Apimaterial' : 'Sin conexión a Apimaterial'}
            </span>
          </div>
          
          {/* Search */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar material por código o descripción (búsqueda automática)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar lista"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {/* Results counter */}
            {!isLoading && materiales.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Mostrando {materiales.length} de {totalItems} resultados
                {debouncedSearch && ` para "${debouncedSearch}"`}
              </div>
            )}
          </div>
          
          {/* Success display */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Éxito</p>
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className={`mb-4 p-3 border rounded-lg flex items-start space-x-2 ${
              error.includes('ya existe') 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                error.includes('ya existe') ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  error.includes('ya existe') ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {error.includes('ya existe') ? 'Producto Duplicado' : 'Error'}
                </p>
                <p className={`text-sm ${
                  error.includes('ya existe') ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {error}
                </p>
                {error.includes('ya existe') && (
                  <p className="text-xs text-yellow-600 mt-1">
                    💡 Puedes buscar el producto existente en la lista de productos o usar un código diferente.
                  </p>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className={`${
                  error.includes('ya existe') ? 'text-yellow-400 hover:text-yellow-600' : 'text-red-400 hover:text-red-600'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Materials List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Cargando materiales...</span>
            </div>
          ) : materiales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No se encontraron materiales</p>
              <p className="text-sm">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materiales.map((material) => (
                <div
                  key={material.MATID}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{material.DESCRIP}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(material.INACTIVO)}`}>
                          {getStatusText(material.INACTIVO)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Código:</strong> {material.CODIGO}</div>
                        <div><strong>Existencia:</strong> {material.EXISTEC ?? 0}</div>
                        <div><strong>Precio:</strong> {formatPrice(material.PRECIO1)}</div>
                        {material.PRECIO2 && material.PRECIO2 > 0 && (
                          <div><strong>Precio Oferta:</strong> {formatPrice(material.PRECIO2)}</div>
                        )}
                        <div><strong>Unidad:</strong> {material.UNIDAD}</div>
                        {material.OBSERV && (
                          <div><strong>Observaciones:</strong> {material.OBSERV}</div>
                        )}
                        <div className="mt-2">
                          <ProductExistenceStatus material={material} />
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <ProductExistenceButton material={material} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {!isLoading && materiales.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || isLoading}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || isLoading}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




















