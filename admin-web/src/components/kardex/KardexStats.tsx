'use client'

import { KardexResponse } from '@/types'

interface KardexStatsProps {
  data: KardexResponse['data'] | null
  isLoading?: boolean
}

export function KardexStats({ data, isLoading = false }: KardexStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-5">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  const statsData = [
    {
      name: 'Total Registros',
      value: data.totales.registros,
      icon: 'document-text',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Cantidad Total',
      value: data.totales.cantidadTotal.toLocaleString('es-CO', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      }),
      icon: 'cube',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Valor Total',
      value: `$${data.totales.valorTotal.toLocaleString('es-CO', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`,
      icon: 'currency-dollar',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Forma de Pago',
      value: data.filtros.formapago,
      icon: 'credit-card',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  const renderIcon = (iconName: string, className: string) => {
    const iconProps = { className, fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor" }
    
    switch (iconName) {
      case 'document-text':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      case 'cube':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
      case 'currency-dollar':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      case 'credit-card':
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
      default:
        return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-md ${stat.bgColor}`}>
                  {renderIcon(stat.icon, `h-6 w-6 ${stat.color}`)}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
