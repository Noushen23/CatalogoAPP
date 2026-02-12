'use client'

import { useState } from 'react'
import { SearchIcon, XIcon, SortAscendingIcon } from '@/components/icons'

interface ProductSearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onClearSearch: () => void
  onSortChange: (sortBy: string) => void
  sortBy: string
  totalResults?: number
}

export function ProductSearchBar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  onSortChange,
  sortBy,
  totalResults
}: ProductSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClearSearch()
    }
  }

  const sortOptions = [
    { value: 'title', label: 'Nombre A-Z' },
    { value: 'title_desc', label: 'Nombre Z-A' },
    { value: 'price', label: 'Precio: Menor a Mayor' },
    { value: 'price_desc', label: 'Precio: Mayor a Menor' },
    { value: 'stock', label: 'Stock: Menor a Mayor' },
    { value: 'stock_desc', label: 'Stock: Mayor a Menor' },
    { value: 'created', label: 'Más Recientes' },
    { value: 'created_desc', label: 'Más Antiguos' }
  ]

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Campo de búsqueda */}
        <div className="flex-1 relative">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por nombre, SKU, código de barras..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`block w-full pl-10 pr-10 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                isFocused ? 'border-blue-500' : 'border-gray-300'
              }`}
            />
            {searchTerm && (
              <button
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Controles adicionales */}
        <div className="flex gap-2">
          {/* Selector de ordenamiento */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SortAscendingIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Información de resultados */}
      {searchTerm && totalResults !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {totalResults} producto{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}{' '}
              para &quot;{searchTerm}&quot;
            </span>
            <button
              onClick={onClearSearch}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar búsqueda
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
