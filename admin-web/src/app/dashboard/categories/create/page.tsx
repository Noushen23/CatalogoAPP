'use client'

import { useRouter } from 'next/navigation'
import { CategoryForm } from '@/components/categories/CategoryForm'

export default function CreateCategoryPage() {
  const router = useRouter()

  const handleSuccess = () => {
    // Redirigir a la lista de categorías después de crear exitosamente
    router.push('/dashboard/categories')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Agregar Categoría</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea una nueva categoría para organizar tus productos
        </p>
      </div>

      <CategoryForm onSuccess={handleSuccess} />
    </div>
  )
}
