'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKardexByFormaPago } from '@/lib/admin-kardex'
import { KardexFilters } from '@/components/kardex/KardexFilters'
import { KardexStats } from '@/components/kardex/KardexStats'
import { KardexTable } from '@/components/kardex/KardexTable'

export default function KardexPage() {
  const [fecha, setFecha] = useState('')
  const [formapago, setFormapago] = useState('MU')

  const { data: kardexData, isLoading, error, refetch } = useQuery({
    queryKey: ['kardex', fecha, formapago],
    queryFn: () => getKardexByFormaPago(fecha, formapago),
    enabled: false, // Solo ejecutar cuando se haga clic en consultar
  })

  const handleFilter = (newFecha: string, newFormapago: string) => {
    setFecha(newFecha)
    setFormapago(newFormapago)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Consulta de Kardex</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulta de movimientos de kardex por forma de pago y fecha
        </p>
      </div>

      <KardexFilters onFilter={handleFilter} isLoading={isLoading} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al consultar kardex
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error instanceof Error ? error.message : 'Error desconocido'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {kardexData && (
        <>
          <KardexStats data={kardexData.data} isLoading={isLoading} />
          
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Resultados de la Consulta
            </h2>
            <KardexTable data={kardexData.data.resultados} isLoading={isLoading} />
          </div>
        </>
      )}

      {!kardexData && !isLoading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Selecciona una fecha para consultar</h3>
          <p className="mt-1 text-sm text-gray-500">
            Usa los filtros de arriba para consultar los movimientos de kardex.
          </p>
        </div>
      )}
    </div>
  )
}
