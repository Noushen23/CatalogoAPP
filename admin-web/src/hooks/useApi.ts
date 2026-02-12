import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query"
import { CONFIG } from "@/lib/config"

export function useOptimizedQuery<T>(
  key: QueryKey,
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    gcTime?: number
    refetchOnWindowFocus?: boolean
  }
) {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: options?.staleTime ?? CONFIG.QUERY.STALE_TIME,
    gcTime: options?.gcTime ?? CONFIG.QUERY.GC_TIME,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: CONFIG.API.MAX_RETRIES,
  })
}

export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: unknown, variables: TVariables) => void
    invalidateQueries?: QueryKey[]
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      options?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables)
    },
    retry: false,
  })
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return (queryKeys: QueryKey[]) => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
    })
  }
}
