'use client'

import { useQuery } from '@tanstack/react-query'
import { AdminProduct, AdminProductsService } from '@/lib/admin-products'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ClockIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CubeIcon,
  XCircleIcon,
  PencilIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import type { ComponentType } from 'react'

interface ProductHistoryProps {
  product: AdminProduct
}

interface HistoryEvent {
  id: string
  tipoEvento: string
  descripcion?: string
  campoModificado?: string
  valorAnterior?: string | number
  valorNuevo?: string | number
  fechaEvento: string | Date
  cantidad?: number
  numeroOrden?: string
  usuario?: {
    nombreCompleto?: string
    email: string
  }
  datosAdicionales?: Record<string, unknown>
}

// Mapeo de tipos de evento a iconos y colores
const eventConfig: Record<string, { icon: ComponentType<{ className?: string }>; color: string; bgColor: string; label: string }> = {
  creacion: {
    icon: PlusCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Creación'
  },
  actualizacion: {
    icon: PencilIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Actualización'
  },
  venta: {
    icon: ShoppingBagIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Venta'
  },
  cambio_stock: {
    icon: CubeIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Cambio de Stock'
  },
  cambio_precio: {
    icon: CurrencyDollarIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Cambio de Precio'
  },
  cambio_estado: {
    icon: ArrowPathIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Cambio de Estado'
  },
  eliminacion: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Eliminación'
  }
}

export function ProductHistory({ product }: ProductHistoryProps) {
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['product-history', product.id],
    queryFn: () => AdminProductsService.getProductHistory(product.id, 100, 0),
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2
  })

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: es })
    } catch {
      return 'Fecha no disponible'
    }
  }

  const formatPrice = (value: string | number) => {
    if (!value) return 'N/A'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return value
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue)
  }

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-red-800">Error al cargar historial</p>
            <p className="text-xs text-red-600 mt-1">
              {error instanceof Error ? error.message : 'No se pudieron obtener los datos'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const history = historyData?.data?.historial || []

  // Si no hay historial
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial disponible</h3>
        <p className="mt-1 text-sm text-gray-500">
          Este producto aún no tiene eventos registrados en su historial.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Información del historial */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Total de eventos: {historyData?.data?.pagination?.total || history.length}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Mostrando los últimos {history.length} eventos
            </p>
          </div>
        </div>
      </div>

      {/* Timeline del historial */}
      <div className="relative">
        {/* Línea vertical del timeline */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-6">
          {history.map((event: HistoryEvent) => {
            const config = eventConfig[event.tipoEvento] || {
              icon: ClockIcon,
              color: 'text-gray-600',
              bgColor: 'bg-gray-100',
              label: event.tipoEvento
            }
            const Icon = config.icon

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Icono del evento */}
                <div className={`relative z-10 flex-shrink-0 ${config.bgColor} p-2 rounded-full`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Contenido del evento */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        {event.campoModificado && (
                          <span className="text-xs text-gray-500">
                            Campo: {event.campoModificado}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-900 mb-2">
                        {event.descripcion || `${config.label} del producto`}
                      </p>

                      {/* Detalles del cambio */}
                      {(event.valorAnterior || event.valorNuevo) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {event.valorAnterior && (
                              <div>
                                <span className="font-medium text-gray-600">Valor anterior:</span>
                                <p className="text-gray-900 mt-1">
                                  {event.campoModificado === 'precio' 
                                    ? formatPrice(event.valorAnterior)
                                    : event.valorAnterior}
                                </p>
                              </div>
                            )}
                            {event.valorNuevo && (
                              <div>
                                <span className="font-medium text-gray-600">Valor nuevo:</span>
                                <p className="text-gray-900 mt-1">
                                  {event.campoModificado === 'precio'
                                    ? formatPrice(event.valorNuevo)
                                    : event.valorNuevo}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Información adicional */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatDate(event.fechaEvento)}</span>
                        </div>
                        {event.cantidad && (
                          <div className="flex items-center gap-1">
                            <CubeIcon className="h-3 w-3" />
                            <span>Cantidad: {event.cantidad}</span>
                          </div>
                        )}
                        {event.numeroOrden && (
                          <div className="flex items-center gap-1">
                            <ShoppingBagIcon className="h-3 w-3" />
                            <span>Orden: {event.numeroOrden}</span>
                          </div>
                        )}
                        {event.usuario && (
                          <div className="flex items-center gap-1">
                            <span>Por: {event.usuario.nombreCompleto || event.usuario.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Datos adicionales (precio unitario, subtotal, etc.) */}
                      {event.datosAdicionales && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-700 font-medium">
                              Ver detalles adicionales
                            </summary>
                            <div className="mt-2 space-y-1 text-blue-600">
                              {Object.entries(event.datosAdicionales).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium">{key}:</span>
                                  <span>
                                    {key.includes('precio') || key.includes('subtotal')
                                      ? formatPrice(value as number)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Paginación (si hay más registros) */}
      {historyData?.data?.pagination?.hasMore && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Mostrando {history.length} de {historyData.data.pagination.total} eventos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Usa los parámetros limit y offset para cargar más eventos
          </p>
        </div>
      )}
    </div>
  )
}
