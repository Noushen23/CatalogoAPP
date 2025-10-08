'use client'

import React, { memo, useMemo } from 'react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: any, item: T) => React.ReactNode
  sortable?: boolean
  width?: string
  className?: string
}

interface OptimizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  className?: string
}

// Componente de celda optimizado
const TableCell = memo(({ 
  children, 
  className = '',
  onClick 
}: { 
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) => (
  <td 
    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}
    onClick={onClick}
  >
    {children}
  </td>
))

TableCell.displayName = 'TableCell'

// Componente de fila optimizado
const TableRow = memo(({ 
  item, 
  columns, 
  onRowClick 
}: { 
  item: any
  columns: Column<any>[]
  onRowClick?: (item: any) => void
}) => {
  const handleClick = () => {
    onRowClick?.(item)
  }

  return (
    <tr 
      className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {columns.map((column, index) => {
        const value = typeof column.key === 'string' 
          ? column.key.split('.').reduce((obj, key) => obj?.[key], item)
          : item[column.key]
        
        return (
          <TableCell 
            key={index}
            className={column.className}
          >
            {column.render ? column.render(value, item) : value}
          </TableCell>
        )
      })}
    </tr>
  )
})

TableRow.displayName = 'TableRow'

// Componente principal de tabla optimizado
export const OptimizedTable = memo(<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  className = '',
}: OptimizedTableProps<T>) => {
  // Memoizar el contenido de la tabla
  const tableContent = useMemo(() => {
    if (loading) {
      return (
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index}>
              {columns.map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </TableCell>
              ))}
            </tr>
          ))}
        </tbody>
      )
    }

    if (data.length === 0) {
      return (
        <tbody>
          <tr>
            <TableCell 
              className="text-center py-8 text-gray-500"
              colSpan={columns.length}
            >
              {emptyMessage}
            </TableCell>
          </tr>
        </tbody>
      )
    }

    return (
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((item, index) => (
          <TableRow
            key={item.id || index}
            item={item}
            columns={columns}
            onRowClick={onRowClick}
          />
        ))}
      </tbody>
    )
  }, [data, columns, loading, emptyMessage])

  return (
    <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        {tableContent}
      </table>
    </div>
  )
})

OptimizedTable.displayName = 'OptimizedTable'








