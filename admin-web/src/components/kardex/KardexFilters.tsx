'use client'

import { useState } from 'react'

interface KardexFiltersProps {
  onFilter: (fecha: string, formapago: string) => void
  isLoading?: boolean
}

export function KardexFilters({ onFilter, isLoading = false }: KardexFiltersProps) {
  const [fecha, setFecha] = useState('')
  const [formapago, setFormapago] = useState('MU')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (fecha) {
      onFilter(fecha, formapago)
    }
  }

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setFecha(today)
    onFilter(today, formapago)
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Filtros de Consulta
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">
                Fecha
              </label>
              <input
                type="date"
                id="fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="formapago" className="block text-sm font-medium text-gray-700">
                Forma de Pago
              </label>
              <select
                id="formapago"
                value={formapago}
                onChange={(e) => setFormapago(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="MU">MU - Efectivo</option>
                <option value="TC">TC - Tarjeta de Crédito</option>
                <option value="TD">TD - Tarjeta Débito</option>
                <option value="TR">TR - Transferencia</option>
                <option value="CH">CH - Cheque</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleToday}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Hoy
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !fecha}
              className="bg-indigo-600 text-white px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
