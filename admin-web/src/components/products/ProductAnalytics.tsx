'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AdminProduct, AdminProductsService } from '@/lib/admin-products'

interface ProductAnalyticsProps {
  product: AdminProduct
}

interface DatosMensuales {
  mes: string
  ventas?: number
  stock?: number
  precio?: number
  ingresos?: number
  unidadesVendidas?: number
}

export function ProductAnalytics({ product }: ProductAnalyticsProps) {
  // Obtener datos de analíticas del backend
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['product-analytics', product.id],
    queryFn: () => AdminProductsService.getProductAnalytics(product.id, 3),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2
  })

  // Procesar datos para los gráficos
  const chartData = useMemo(() => {
    if (!analyticsData?.data?.datosMensuales) {
      return []
    }
    return analyticsData.data.datosMensuales.map((item: DatosMensuales) => ({
      mes: item.mes,
      ventas: item.ventas || 0,
      stock: item.stock || product.stock || 0,
      precio: item.precio || product.price || 0,
      ingresos: item.ingresos || 0,
      unidadesVendidas: item.unidadesVendidas || item.ventas || 0
    }))
  }, [analyticsData, product.stock, product.price])

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!analyticsData?.data?.estadisticas) {
      return {
        totalVentas: 0,
        totalIngresos: 0,
        promedioVentas: 0,
        stockActual: product.stock || 0
      }
    }

    const estadisticas = analyticsData.data.estadisticas
    return {
      totalVentas: estadisticas.totalVentas || 0,
      totalIngresos: estadisticas.totalIngresos || 0,
      promedioVentas: estadisticas.promedioVentas || 0,
      stockActual: estadisticas.stockActual || product.stock || 0
    }
  }, [analyticsData, product.stock])

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Error al cargar analíticas</p>
            <p className="text-xs text-red-600 mt-1">
              {error instanceof Error ? error.message : 'No se pudieron obtener los datos'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay datos
  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos disponibles</h3>
        <p className="mt-1 text-sm text-gray-500">
          Este producto aún no tiene ventas registradas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Ventas</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalVentas}</p>
              <p className="text-xs text-blue-500 mt-1">unidades</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-900">
                ${(stats.totalIngresos / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-green-500 mt-1">COP</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Promedio Mensual</p>
              <p className="text-2xl font-bold text-purple-900">{stats.promedioVentas}</p>
              <p className="text-xs text-purple-500 mt-1">unidades/mes</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Stock Actual</p>
              <p className="text-2xl font-bold text-orange-900">{stats.stockActual}</p>
              <p className="text-xs text-orange-500 mt-1">unidades</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas y Stock */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Ventas y Stock</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="mes" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return [0, name ?? '']
                if (name === 'ventas' || name === 'stock') {
                  return [value, name === 'ventas' ? 'Ventas' : 'Stock']
                }
                return value
              }}
            />
            <Legend 
              formatter={(value) => value === 'ventas' ? 'Ventas' : 'Stock'}
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Area 
              type="monotone" 
              dataKey="ventas" 
              stroke="#3B82F6" 
              fillOpacity={1} 
              fill="url(#colorVentas)"
              name="Ventas"
            />
            <Area 
              type="monotone" 
              dataKey="stock" 
              stroke="#10B981" 
              fillOpacity={1} 
              fill="url(#colorStock)"
              name="Stock"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Ingresos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="mes" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number | undefined) => [
                `$${((value ?? 0) / 1000000).toFixed(2)}M COP`,
                'Ingresos'
              ]}
            />
            <Legend />
            <Bar 
              dataKey="ingresos" 
              fill="#8B5CF6" 
              radius={[8, 8, 0, 0]}
              name="Ingresos"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Tendencia de Precio */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Precio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="mes" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number | undefined) => [
                `$${(value ?? 0).toLocaleString('es-CO')} COP`,
                'Precio'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="precio" 
              stroke="#F59E0B" 
              strokeWidth={3}
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
              name="Precio"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Información adicional */}
      {analyticsData?.data?.estadisticas && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Información de Analíticas</p>
              <p className="text-xs text-blue-700 mt-1">
                Datos basados en los últimos {analyticsData.data.estadisticas.mesesAnalizados} meses. 
                {analyticsData.data.estadisticas.mesesConVentas > 0 
                  ? ` ${analyticsData.data.estadisticas.mesesConVentas} mes(es) con ventas registradas.`
                  : ' Aún no hay ventas registradas para este período.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
