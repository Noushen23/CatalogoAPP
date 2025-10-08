import { CategoriesTable } from '@/components/categories/CategoriesTable'
import { AddCategoryButton } from '@/components/categories/AddCategoryButton'

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categorías</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las categorías de productos de tu tienda
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <AddCategoryButton />
        </div>
      </div>

      <CategoriesTable />
    </div>
  )
}
