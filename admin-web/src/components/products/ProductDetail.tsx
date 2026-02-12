'use client'

import { useState } from 'react'
import { AdminProduct } from '@/lib/admin-products'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  EyeIcon,
  ChartBarIcon,
  ClockIcon,
  TagIcon,
  CubeIcon,
  PhotoIcon,
  StarIcon,
  CalendarIcon,
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import { ImageManager } from './ImageManager'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProductDetailProps {
  product: AdminProduct
  onEdit?: () => void
  onBack?: () => void
}

export function ProductDetail({ product, onEdit, onBack }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'analytics' | 'history'>('overview')
  const [showFullDescription, setShowFullDescription] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), 'dd MMMM yyyy', { locale: es })
    } catch {
      return 'Fecha no disponible'
    }
  }

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: EyeIcon },
    { id: 'images', name: 'Imágenes', icon: PhotoIcon },
    { id: 'analytics', name: 'Analíticas', icon: ChartBarIcon },
    { id: 'history', name: 'Historial', icon: ClockIcon }
  ] as const

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-sm text-gray-500">ID: {product.id}</span>
                  <span className="text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Creado: {formatDate(product.fechaCreacion || product.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <ShareIcon className="h-4 w-4 mr-2" />
                Compartir
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Imprimir
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 inline mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white">
        {activeTab === 'overview' && (
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Título</label>
                      <p className="mt-1 text-sm text-gray-900">{product.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <p className="mt-1 text-sm text-gray-900">{product.sku || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Categoría</label>
                      <p className="mt-1 text-sm text-gray-900">{product.category?.name || 'Sin categoría'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stock</label>
                      <p className="mt-1 text-sm text-gray-900">{product.stock || 0} unidades</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Descripción</h3>
                  <div className="prose max-w-none">
                    {product.description ? (
                      <div className="text-sm text-gray-700">
                        {showFullDescription || product.description.length <= 200 ? (
                          <p>{product.description}</p>
                        ) : (
                          <>
                            <p>{product.description.substring(0, 200)}...</p>
                            <button
                              onClick={() => setShowFullDescription(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                            >
                              Leer más
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Sin descripción</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Etiquetas</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Precios</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Precio</span>
                      <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
                    </div>
                    {product.priceOffer && product.onOffer && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Precio de oferta</span>
                        <span className="text-sm font-bold text-green-600">{formatPrice(product.priceOffer)}</span>
                      </div>
                    )}
                    {product.barcode && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Código de barras</span>
                        <span className="text-sm text-gray-500">{product.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas Rápidas</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CubeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Stock</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{product.stock || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ShoppingCartIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Ventas</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <HeartIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Favoritos</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <StarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Calificación</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Sin calificaciones</span>
                    </div>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Sistema</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Creado:</span>
                      <p className="text-gray-600">{formatDate(product.fechaCreacion || product.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Actualizado:</span>
                      <p className="text-gray-600">{formatDate(product.fechaActualizacion || product.updatedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">ID:</span>
                      <p className="text-gray-600 font-mono text-xs">{product.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="px-6 py-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Imágenes</h3>
              <p className="text-sm text-gray-600">
                Administra las imágenes del producto. Puedes subir, eliminar, reordenar y establecer la imagen principal.
              </p>
            </div>
            <ImageManager
              productId={product.id}
              images={product.images || []}
              maxImages={10}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="px-6 py-6">
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Analíticas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Las analíticas del producto estarán disponibles próximamente.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="px-6 py-6">
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Historial</h3>
              <p className="mt-1 text-sm text-gray-500">
                El historial de cambios estará disponible próximamente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

