import { useOptimizedQuery, useOptimizedMutation } from './useApi'
import { ApimaterialService, MaterialFilters } from '@/lib/apimaterial-service'

export function useMaterialesTNS(filters?: MaterialFilters) {
  return useOptimizedQuery(
    ['apimaterial-materiales', JSON.stringify(filters)],
    () => ApimaterialService.getMateriales(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 5 * 60 * 1000, // 5 minutos
      enabled: true,
    }
  )
}

export function useMaterialTNS(id: number, conPrecios: boolean = true) {
  return useOptimizedQuery(
    ['apimaterial-material', id.toString(), conPrecios.toString()],
    () => ApimaterialService.getMaterialById(id, conPrecios),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    }
  )
}

export function useMaterialByCodigoTNS(codigo: string, conPrecios: boolean = true) {
  return useOptimizedQuery(
    ['apimaterial-material-codigo', codigo, conPrecios.toString()],
    () => ApimaterialService.getMaterialByCodigo(codigo, conPrecios),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    }
  )
}

export function useApimaterialConnection() {
  return useOptimizedQuery(
    ['apimaterial-connection'],
    () => ApimaterialService.checkConnection(),
    {
      staleTime: 30 * 1000, // 30 segundos
      gcTime: 2 * 60 * 1000, // 2 minutos
    }
  )
}

export function useApimaterialSystemInfo() {
  return useOptimizedQuery(
    ['apimaterial-system-info'],
    () => ApimaterialService.getSystemInfo(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    }
  )
}

export function useSearchMaterialesTNS() {
  return useOptimizedMutation(
    async (searchTerm: string) => {
      return await ApimaterialService.getMateriales({
        page: 1,
        limit: 50,
        search: searchTerm,
        conPrecios: true,
      })
    },
    {
      invalidateQueries: [['apimaterial-materiales']],
    }
  )
}