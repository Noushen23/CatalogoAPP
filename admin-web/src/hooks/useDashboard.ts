import { useQuery } from '@tanstack/react-query';
import { AdminProductsService } from '@/lib/admin-products';

// Interfaces simplificadas para datos básicos
export interface BasicDashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
}

// Clave para el cache de React Query
const DASHBOARD_QUERY_KEY = ['dashboard'];

// Hook simplificado para obtener estadísticas básicas del dashboard
export const useDashboardStats = () => {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'stats'],
    queryFn: async (): Promise<BasicDashboardStats> => {
      try {
        // Obtener productos del backend real
        const productsResponse = await AdminProductsService.getProducts();
        const products = productsResponse.data || [];
        
        // Calcular estadísticas básicas
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.isActive).length;
        const lowStockProducts = products.filter(p => p.stock < 10).length;
        
        return {
          totalProducts,
          activeProducts,
          lowStockProducts,
        };
      } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

// Hook de conveniencia simplificado
export const useDashboard = () => {
  const dashboardStats = useDashboardStats();

  return {
    // Datos
    stats: dashboardStats.data,
    
    // Estados de carga
    isLoading: dashboardStats.isLoading,
    isError: dashboardStats.isError,
    
    // Errores
    error: dashboardStats.error,
    
    // Funciones de refetch
    refetch: dashboardStats.refetch,
  };
};