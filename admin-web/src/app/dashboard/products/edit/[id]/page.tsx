'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AdminProductsService, AdminProduct } from '@/lib/admin-products'
import { ProductForm } from '@/components/products/ProductForm'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: async (): Promise<AdminProduct> => {
      try {
        const response = await AdminProductsService.getProduct(productId)
        return response.data
      } catch (error) {
        throw new Error('Producto no encontrado')
      }
    },
    enabled: !!productId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  const handleSuccess = () => {
    router.push('/dashboard/products')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Error</h1>
            <p className="mt-1 text-sm text-gray-500">
              No se pudo cargar el producto
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

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Producto no encontrado</h1>
            <p className="mt-1 text-sm text-gray-500">
              El producto que buscas no existe
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
          onClick={() => router.push('/dashboard/products')}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Producto</h1>
          <p className="mt-1 text-sm text-gray-500">
            Modifica la información del producto: {product?.title || 'Cargando...'}
          </p>
        </div>
      </div>

      {product ? (
        <ProductForm product={product} onSuccess={handleSuccess} />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <p className="text-gray-500">Cargando datos del producto...</p>
          </div>
        </div>
      )}
    </div>
  )
}

