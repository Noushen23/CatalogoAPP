import { useState, useCallback } from 'react'

// Hook genérico para manejo de formularios
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: (values: T) => Record<string, string>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Actualizar un campo específico
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Limpiar error si existe
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }, [errors])

  // Manejar cambio de input
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    
    let processedValue: any = value
    
    // Procesar diferentes tipos de input
    if (type === 'number') {
      processedValue = value === '' ? 0 : Number(value)
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked
    } else if (name.includes('tags') && Array.isArray(values[name as keyof T])) {
      // Manejar tags como array
      processedValue = value.split(',').map(tag => tag.trim()).filter(Boolean)
    }
    
    setValue(name as keyof T, processedValue)
  }, [setValue, values])

  // Marcar campo como tocado
  const setTouchedField = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }))
  }, [])

  // Validar formulario
  const validate = useCallback(() => {
    if (!validationSchema) return true
    
    const newErrors = validationSchema(values)
    setErrors(newErrors)
    
    return Object.keys(newErrors).length === 0
  }, [values, validationSchema])

  // Resetear formulario
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // Actualizar múltiples valores
  const setValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setValues,
    handleChange,
    setTouchedField,
    validate,
    reset,
    setIsSubmitting,
    isValid: Object.keys(errors).length === 0,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
  }
}








