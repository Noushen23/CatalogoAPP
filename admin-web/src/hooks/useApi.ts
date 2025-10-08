import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CONFIG } from '@/lib/config'

// Hook para queries optimizadas
export function useOptimizedQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    gcTime?: number
  }
) {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: options?.staleTime ?? CONFIG.QUERY.STALE_TIME,
    gcTime: options?.gcTime ?? CONFIG.QUERY.GC_TIME,
    enabled: options?.enabled ?? true,
    retry: CONFIG.API.MAX_RETRIES,
  })
}

// Hook para mutaciones optimizadas
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    invalidateQueries?: string[][]
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      
      // Callback personalizado
      options?.onSuccess?.(data, variables)
    },
    onError: options?.onError,
    retry: false, // No reintentar mutaciones por defecto
  })
}

// Hook para invalidar múltiples queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return (queryKeys: string[][]) => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
    })
  }
}








