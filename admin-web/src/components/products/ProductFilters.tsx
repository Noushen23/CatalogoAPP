'use client'

import { useState } from 'react'
import { AdminCategoriesService, AdminCategory } from '@/lib/admin-categories'
import { useQuery } from '@tanstack/react-query'

interface ProductFiltersProps {
  onFiltersChange?: (filters: {
    category: string
    stock: string
  }) => void
}

export function ProductFilters({ onFiltersChange }: ProductFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStock, setSelectedStock] = useState<string>('all')

  // Consulta de categorías
  const { data: categoriesResponse } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: AdminCategoriesService.getCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  const categories = categoriesResponse?.data || []

  const handleFilterChange = (type: string, value: string) => {
    const newFilters = {
      category: selectedCategory,
      stock: selectedStock,
      [type]: value
    }

    if (type === 'category') setSelectedCategory(value)
    if (type === 'stock') setSelectedStock(value)

    onFiltersChange?.(newFilters)
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={selectedCategory}
            onChange={e => handleFilterChange('category', e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat: AdminCategory) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado de Stock
          </label>
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={selectedStock}
            onChange={e => handleFilterChange('stock', e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock bajo</option>
            <option value="out_of_stock">Agotado</option>
          </select>
        </div>
      </div>
    </div>
  )
}
