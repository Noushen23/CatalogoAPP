'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AdminProduct } from '@/lib/admin-products'
import { Gender, Size, CreateProductRequest } from '@/types'
import { useForm } from '@/hooks/useForm'
import { useCreateProduct, useUpdateProduct, useCategories } from '@/hooks/useProducts'
import { CONFIG } from '@/lib/config'

interface ProductFormProps {
  product?: AdminProduct
  onSuccess?: () => void
}

// Componente de input optimizado
const FormInput = memo(({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  required = false,
  placeholder = '',
  ...props 
}: {
  label: string
  name: string
  type?: string
  value: any
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  required?: boolean
  placeholder?: string
  [key: string]: any
}) => (
  <div className="space-y-2">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      }`}
      {...props}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
))

FormInput.displayName = 'FormInput'

// Componente de textarea optimizado
const FormTextarea = memo(({ 
  label, 
  name, 
  value, 
  onChange, 
  error, 
  required = false,
  rows = 4,
  ...props 
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  required?: boolean
  rows?: number
  [key: string]: any
}) => (
  <div className="space-y-2">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      }`}
      {...props}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
))

FormTextarea.displayName = 'FormTextarea'

// Componente de checkbox optimizado
const FormCheckbox = memo(({ 
  label, 
  name, 
  checked, 
  onChange, 
  ...props 
}: {
  label: string
  name: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  [key: string]: any
}) => (
  <div className="flex items-center">
    <input
      id={name}
      name={name}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      {...props}
    />
    <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
      {label}
    </label>
  </div>
))

FormCheckbox.displayName = 'FormCheckbox'

// Componente principal optimizado
export const ProductFormOptimized = memo<ProductFormProps>(({ product, onSuccess }) => {
  const router = useRouter()
  
  // Valores iniciales del formulario
  const initialValues = useMemo(() => ({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    images: product?.images || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured || false,
    gender: product?.gender || Gender.Unisex,
    sizes: product?.sizes || [],
    tags: product?.tags || [],
    categoryId: product?.categoryId || '',
  }), [product])

  // Hook de formulario optimizado
  const {
    values,
    errors,
    handleChange,
    validate,
    reset,
    isSubmitting,
    setIsSubmitting,
    isValid,
  } = useForm(initialValues)

  // Hooks de API optimizados
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  // Manejo de envío optimizado
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSubmitting(true)
    
    try {
      const slug = values.title.toLowerCase().replace(/\s+/g, '-')
      const productData: CreateProductRequest = {
        ...values,
        slug,
      }

      if (product?.id) {
        await updateProduct.mutateAsync({ id: product.id, data: productData })
      } else {
        await createProduct.mutateAsync(productData)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(CONFIG.ROUTES.PRODUCTS)
      }
    } catch (error: any) {
      console.error('Error al guardar producto:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, product, updateProduct, createProduct, onSuccess, router])

  // Manejo de tamaños optimizado
  const handleSizeToggle = useCallback((size: Size) => {
    const newSizes = values.sizes.includes(size)
      ? values.sizes.filter(s => s !== size)
      : [...values.sizes, size]
    
    handleChange({
      target: { name: 'sizes', value: newSizes }
    } as any)
  }, [values.sizes, handleChange])

  // Manejo de tags optimizado
  const handleTagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
    handleChange({
      target: { name: 'tags', value: tags }
    } as any)
  }, [handleChange])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Indicador de modo */}
      {product && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Modo Edición
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Editando producto: <strong>{product.title}</strong></p>
                <p>ID: {product.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información básica */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Información Básica
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Nombre del Producto"
            name="title"
            value={values.title}
            onChange={handleChange}
            error={errors.title}
            required
            placeholder="Ingresa el nombre del producto"
          />
          
          <FormInput
            label="Precio"
            name="price"
            type="number"
            value={values.price}
            onChange={handleChange}
            error={errors.price}
            required
            min="0"
            step="0.01"
          />
          
          <FormInput
            label="Stock"
            name="stock"
            type="number"
            value={values.stock}
            onChange={handleChange}
            error={errors.stock}
            required
            min="0"
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Género
            </label>
            <select
              name="gender"
              value={values.gender}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={Gender.Unisex}>Unisex</option>
              <option value={Gender.Masculino}>Masculino</option>
              <option value={Gender.Femenino}>Femenino</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6">
          <FormTextarea
            label="Descripción"
            name="description"
            value={values.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Describe el producto..."
          />
        </div>
      </div>

      {/* Configuración */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Configuración
        </h3>
        
        <div className="space-y-4">
          <FormCheckbox
            label="Producto activo"
            name="isActive"
            checked={values.isActive}
            onChange={handleChange}
          />
          
          <FormCheckbox
            label="Producto destacado"
            name="isFeatured"
            checked={values.isFeatured}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push(CONFIG.ROUTES.PRODUCTS)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Cancelar
        </button>
        
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Guardando...' : product ? 'Actualizar' : 'Crear'} Producto
        </button>
      </div>
    </form>
  )
})

ProductFormOptimized.displayName = 'ProductFormOptimized'








