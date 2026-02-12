'use client'

import { useState } from 'react'
import { ProductsTable } from '@/components/products/ProductsTable'
import ApimaterialSelector from '@/components/products/ApimaterialSelector'
import ApimaterialProductNotification, { ApimaterialProductResult } from '@/components/products/ApimaterialProductNotification'
import { ProductFilters } from '@/components/products/ProductFilters'
import { Database, ImageIcon } from 'lucide-react'

export default function ProductsPage() {
  const [filters, setFilters] = useState({
    category: 'all',
    stock: 'all'
  })
  
  const [isApimaterialOpen, setIsApimaterialOpen] = useState(false)
  const [productCreationResult, setProductCreationResult] = useState<ApimaterialProductResult | null>(null)

  // Handler para actualizar filtros
  const handleFiltersChange = (newFilters: {
    category: string
    stock: string
  }) => {
    setFilters(newFilters)
  }
  
  const handleProductCreated = (result: ApimaterialProductResult) => {
    console.warn('Producto creado desde Apimaterial:', result)
    setProductCreationResult(result)
    setIsApimaterialOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Productos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona el catálogo de productos de tu tienda
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setIsApimaterialOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Database className="h-4 w-4 mr-2" />
            Crear desde Apimaterial
          </button>
          <a
            href="/dashboard/products/images"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Gestionar Imágenes
          </a>
        </div>
      </div>

      {/* Filtros rápidos */}
      <ProductFilters onFiltersChange={handleFiltersChange} />

      {/* Tabla de productos - key fuerza remount al cambiar filtros */}
      <ProductsTable 
        key={`products-${filters.category}-${filters.stock}`}
        filters={filters} 
      />
      
      {/* Modal Apimaterial */}
      {isApimaterialOpen && (
        <ApimaterialSelector
          onProductCreated={handleProductCreated}
          onClose={() => setIsApimaterialOpen(false)}
        />
      )}
      
      {/* Notificación de creación */}
      <ApimaterialProductNotification
        result={productCreationResult}
        onClose={() => setProductCreationResult(null)}
      />
    </div>
  )
}
