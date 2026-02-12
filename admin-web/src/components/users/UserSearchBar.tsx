'use client'

import { SearchIcon, XIcon } from '@/components/icons'

interface UserSearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onClearSearch: () => void
  onSortChange: (sort: string) => void
  sortBy: string
  totalResults: number
}

export function UserSearchBar({
  searchTerm,
  onSearchChange,
  onClearSearch,
  onSortChange,
  sortBy,
  totalResults
}: UserSearchBarProps) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XIcon size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Ordenar */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 whitespace-nowrap">Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="created_desc">Más recientes</option>
            <option value="created">Más antiguos</option>
            <option value="name">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
            <option value="email">Email A-Z</option>
            <option value="email_desc">Email Z-A</option>
          </select>
        </div>
      </div>

      {/* Resultados */}
      {totalResults > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {totalResults} usuario{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

