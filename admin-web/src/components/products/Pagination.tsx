'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  itemsPerPageOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100]
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getVisiblePages = () => {
    const delta = 2
    const range: number[] = []
    const rangeWithDots: Array<{ key: string; value: number | '...' }> = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push({ key: 'page-1', value: 1 }, { key: 'dots-left', value: '...' })
    } else {
      rangeWithDots.push({ key: 'page-1', value: 1 })
    }

    rangeWithDots.push(...range.map((page) => ({ key: `page-${page}`, value: page })))

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push({ key: 'dots-right', value: '...' }, { key: `page-${totalPages}`, value: totalPages })
    } else if (totalPages > 1) {
      rangeWithDots.push({ key: `page-${totalPages}`, value: totalPages })
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Mostrar:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700">por página</span>
          </div>
          <div className="text-sm text-gray-700">
            Mostrando {totalItems} producto{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between w-full">
        {/* Información de elementos */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Mostrar:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">por página</span>
        </div>

        {/* Información de paginación */}
        <div className="text-sm text-gray-700">
          Mostrando {startItem} a {endItem} de {totalItems} producto{totalItems !== 1 ? 's' : ''}
        </div>

        {/* Controles de paginación */}
        <div className="flex items-center space-x-1">
          {/* Botón anterior */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Números de página */}
          {visiblePages.map((page) => {
            if (page.value === '...') {
              return (
                <span
                  key={page.key}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300"
                >
                  ...
                </span>
              )
            }

            const pageNumber = page.value
            const isCurrentPage = pageNumber === currentPage

            return (
              <button
                key={page.key}
                onClick={() => onPageChange(pageNumber)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                  isCurrentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {pageNumber}
              </button>
            )
          })}

          {/* Botón siguiente */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
