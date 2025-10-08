'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AdminCategoriesService, AdminCategory } from '@/lib/admin-categories'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function EditCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.id as string

  const { data: category, isLoading, error } = useQuery({
    queryKey: ['admin-category', categoryId],
    queryFn: async (): Promise<AdminCategory> => {
      const response = await AdminCategoriesService.getCategories()
      
      // Buscar la categoría específica
      let categoriesList = []
      if (Array.isArray(response)) {
        categoriesList = response
      } else if (response && response.data && Array.isArray(response.data)) {
        categoriesList = response.data
      } else if (response && response.categories && Array.isArray(response.categories)) {
        categoriesList = response.categories
      }

      const foundCategory = categoriesList.find((c: AdminCategory) => c.id === categoryId)
      if (!foundCategory) {
        throw new Error('Categoría no encontrada')
      }
      
      return foundCategory
    },
    enabled: !!categoryId
  })

  const handleSuccess = () => {
    router.push('/dashboard/categories')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/categories')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mt-2"></div>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/categories')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Error</h1>
            <p className="mt-1 text-sm text-gray-500">
              No se pudo cargar la categoría
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </div>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/categories')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Categoría no encontrada</h1>
            <p className="mt-1 text-sm text-gray-500">
              La categoría que buscas no existe
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push('/dashboard/categories')}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Categoría</h1>
          <p className="mt-1 text-sm text-gray-500">
            Modifica la información de la categoría: {category.name}
          </p>
        </div>
      </div>

      <CategoryForm category={category} onSuccess={handleSuccess} />
    </div>
  )
}
