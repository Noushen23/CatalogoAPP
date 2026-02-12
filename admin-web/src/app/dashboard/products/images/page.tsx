'use client'

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { AdminProductsService, AdminProduct, PaginatedResponse } from '@/lib/admin-products'
import { ProductImage } from '@/types'
import { ImageManager } from '@/components/products/ImageManager'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function ProductImagesPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null)

  // Obtener productos
  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => AdminProductsService.getProducts({ search: searchTerm }),
    staleTime: 2 * 60 * 1000,
  })

  const products = productsResponse?.data || []
  const skeletonItems = Array.from({ length: 5 }, (_, idx) => ({
    id: `skeleton-${idx}`,
  }))

  const handleProductSelect = (product: AdminProduct) => {
    setSelectedProduct(product)
  }

  const handleBackToList = () => {
    setSelectedProduct(null)
  }

  const handleImagesChange = (images: ProductImage[]) => {
    if (selectedProduct) {
      // Actualizar el producto en el cache
      queryClient.setQueryData<PaginatedResponse<AdminProduct>>(['admin-products'], (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: oldData.data.map((p) =>
            p.id === selectedProduct.id ? { ...p, images } : p
          ),
        }
      })
      
      // Actualizar el producto seleccionado
      setSelectedProduct(prev => prev ? { ...prev, images } : null)
    }
  }

  if (selectedProduct) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestión de Imágenes
              </h1>
              <p className="text-sm text-gray-500">
                {selectedProduct.title}
              </p>
            </div>
          </div>
        </div>

        {/* Gestor de imágenes */}
        <div className="bg-white shadow rounded-lg p-6">
          <ImageManager
            productId={selectedProduct.id}
            images={selectedProduct.images || []}
            onImagesChange={handleImagesChange}
            maxImages={15}
          />
        </div>

        {/* Información del producto */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Información del Producto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Título
              </label>
              <p className="mt-1 text-sm text-gray-900">{selectedProduct.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Precio
              </label>
              <p className="mt-1 text-sm text-gray-900">
                ${selectedProduct.price?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock
              </label>
              <p className="mt-1 text-sm text-gray-900">{selectedProduct.stock || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedProduct.isActive ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Gestión de Imágenes de Productos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona un producto para gestionar sus imágenes
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Lista de productos */}
      {isLoading ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="animate-pulse space-y-4">
              {skeletonItems.map((item) => (
                <div key={item.id} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => handleProductSelect(product)}
                  className="block w-full px-6 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Imagen principal */}
                      <div className="flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          (() => {
                            const firstImage = product.images[0]
                            const imageUrl = typeof firstImage === 'string' 
                              ? firstImage 
                              : firstImage?.url || firstImage?.urlImagen || firstImage?.url_imagen
                            
                            if (!imageUrl || imageUrl.trim() === '') {
                              return (
                                <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">Sin imagen</span>
                                </div>
                              )
                            }
                            
                            return (
                              <Image
                                src={imageUrl}
                                alt={product.title}
                                width={48}
                                height={48}
                                sizes="48px"
                                className="h-12 w-12 rounded-lg object-cover"
                                unoptimized
                                onError={(e) => {
                                  console.error('Error cargando imagen:', imageUrl)
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )
                          })()
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Sin imagen</span>
                          </div>
                        )}
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.title}
                          </p>
                          {product.isFeatured && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Destacado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">
                            ${product.price?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Stock: {product.stock || 0}
                          </p>
                          <p className="text-sm text-gray-500">
                            {product.images?.length || 0} imagen{(product.images?.length || 0) !== 1 ? 'es' : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                      {/* Indicadores */}
                      <div className="flex items-center space-x-2">
                        {product.images && product.images.length > 0 && (
                          <div className="flex -space-x-1">
                            {product.images.slice(0, 3).map((image, index) => {
                              const imageUrl = typeof image === 'string' 
                                ? image 
                                : image?.url || image?.urlImagen || image?.url_imagen
                              
                              if (!imageUrl || imageUrl.trim() === '') {
                                return null
                              }
                              
                              return (
                                <Image
                                  key={imageUrl}
                                  src={imageUrl}
                                  alt={`Imagen ${index + 1}`}
                                  width={24}
                                  height={24}
                                  sizes="24px"
                                  className="h-6 w-6 rounded-full object-cover border-2 border-white"
                                  unoptimized
                                  onError={(e) => {
                                    console.error('Error cargando imagen:', imageUrl)
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              )
                            })}
                            {product.images.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  +{product.images.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      <div className="text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
