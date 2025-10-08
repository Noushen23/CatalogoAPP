'use client'

import React, { useState } from 'react'
import { useMaterialesTNS, useApimaterialConnection } from '@/hooks/useApimaterial'
import { useCreateProductFromApimaterialWithCategory } from '@/hooks/useCreateProductFromApimaterialWithCategory'
import { MaterialTNS } from '@/lib/apimaterial-service'
import { Search, RefreshCw, Database, AlertCircle, CheckCircle, Loader2, Plus, X } from 'lucide-react'

interface ApimaterialSelectorProps {
  onProductCreated?: (result: any) => void
  onClose?: () => void
}

export default function ApimaterialSelector({ onProductCreated, onClose }: ApimaterialSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialTNS | null>(null)
  
  // Hooks
  const { data: connectionData } = useApimaterialConnection()
  const { data: materialesData, isLoading, refetch } = useMaterialesTNS({
    page: 1,
    limit: 10,
    search: searchTerm,
    activo: undefined,
    conPrecios: true,
  })
  const createProductMutation = useCreateProductFromApimaterialWithCategory()
  
  const isConnected = connectionData === true
  const materiales = materialesData?.data || []
  
  const handleSearch = () => {
    if (searchTerm.trim().length >= 2) {
      refetch()
    }
  }
  
  const handleCreateProduct = async (material: MaterialTNS) => {
    try {
      console.log('🚀 Creando producto desde material:', material.CODIGO)
      const result = await createProductMutation.mutateAsync(material)
      
      if (result.success) {
        console.log('✅ Producto creado exitosamente:', result)
        if (onProductCreated) {
          onProductCreated(result)
        }
        setSelectedMaterial(null)
      } else {
        console.error('❌ Error creando producto:', result)
        if (onProductCreated) {
          onProductCreated(result)
        }
      }
    } catch (error) {
      console.error('❌ Error en handleCreateProduct:', error)
      const errorResult = {
        success: false,
        message: `Error creando producto: ${error.message}`,
        material: material
      }
      if (onProductCreated) {
        onProductCreated(errorResult)
      }
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Crear Producto desde Apimaterial</h2>
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
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar material por código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searchTerm.trim().length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          
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
                        <div><strong>Precio:</strong> {formatPrice(material.PRECIO1)}</div>
                        {material.PRECIO2 && material.PRECIO2 > 0 && (
                          <div><strong>Precio Oferta:</strong> {formatPrice(material.PRECIO2)}</div>
                        )}
                        <div><strong>Unidad:</strong> {material.UNIDAD}</div>
                        {material.OBSERV && (
                          <div><strong>Observaciones:</strong> {material.OBSERV}</div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleCreateProduct(material)}
                        disabled={createProductMutation.isPending}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createProductMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        <span>Crear Producto</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}














