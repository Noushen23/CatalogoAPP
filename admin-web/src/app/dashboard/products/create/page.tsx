'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'

export default function CreateProductPage() {
  const router = useRouter()

  const handleSuccess = () => {
    // Redirigir a la lista de productos después de crear exitosamente
    router.push('/dashboard/products')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Agregar Producto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea un nuevo producto para tu tienda
        </p>
      </div>

      <ProductForm onSuccess={handleSuccess} />
    </div>
  )
}
