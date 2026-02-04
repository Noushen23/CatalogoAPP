import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';

// Tipos para la migración
export interface MigrationOptions {
  usuario: string;
  codprefijo: string;
  codcomp: string;
  sucid: number;
}

export interface MigrationResponse {
  success: boolean;
  data?: {
    orden: any;
    migrationStatus: {
      ordenSincronizada: boolean;
      itemsSincronizados: number;
      totalItems: number;
      tieneErrores: boolean;
    };
  };
  message?: string;
}

import { migrationApiClient } from '@/lib/migration-api-client'

// Servicio para migración de pedidos
class OrderMigrationService {
  async getMigrationDetails(orderId: string): Promise<MigrationResponse> {
    const response = await migrationApiClient.get(`/orders/${orderId}/detail`);
    return response.data;
  }

  async migrateOrder(orderId: string, options: MigrationOptions): Promise<MigrationResponse> {
    const response = await migrationApiClient.post(`/orders/${orderId}/migrate`, options);
    return response.data;
  }

  async retryMigration(orderId: string, options: MigrationOptions): Promise<MigrationResponse> {
    const response = await migrationApiClient.put(`/orders/${orderId}/retry-migration`, options);
    return response.data;
  }
}

const orderMigrationService = new OrderMigrationService();

// Hooks para migración
export function useOrderMigrationDetails(orderId: string) {
  return useQuery({
    queryKey: ['order-migration', orderId],
    queryFn: () => orderMigrationService.getMigrationDetails(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 1,
  });
}

export function useMigrateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, options }: { orderId: string; options: MigrationOptions }) =>
      orderMigrationService.migrateOrder(orderId, options),
    
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['order-migration', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      toast.success('✅ Pedido migrado exitosamente a TNS', {
        duration: 4000,
        position: 'top-right',
      });
      
    },
    
    onError: (error: any) => {
      console.error('❌ Error en migración:', error);
      
      toast.error(`❌ Error al migrar pedido: ${error.message}`, {
        duration: 5000,
        position: 'top-right',
      });
    },
  });
}

export function useRetryMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, options }: { orderId: string; options: MigrationOptions }) =>
      orderMigrationService.retryMigration(orderId, options),
    
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['order-migration', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      toast.success('🔄 Migración reintentada exitosamente', {
        duration: 4000,
        position: 'top-right',
      });
      
    },
    
    onError: (error: any) => {
      console.error('❌ Error al reintentar migración:', error);
      
      toast.error(`❌ Error al reintentar migración: ${error.message}`, {
        duration: 5000,
        position: 'top-right',
      });
    },
  });
}

// Hook de conveniencia para obtener el estado de migración
export function useMigrationStatus(orderId: string) {
  const { data, isLoading, error } = useOrderMigrationDetails(orderId);
  
  const migrationStatus = data?.data?.migrationStatus;
  const orden = data?.data?.orden;
  const isConfirmada = orden?.estado === 'confirmada';
  
  const status = useMemo(() => {
    if (!migrationStatus) return 'unknown';
    
    if (migrationStatus.tieneErrores) return 'error';
    if (migrationStatus.ordenSincronizada && migrationStatus.itemsSincronizados === migrationStatus.totalItems) {
      return 'completed';
    }
    if (migrationStatus.ordenSincronizada && migrationStatus.itemsSincronizados < migrationStatus.totalItems) {
      return 'partial';
    }
    return 'pending';
  }, [migrationStatus]);
  
  return {
    status,
    migrationStatus,
    orden,
    isLoading,
    error,
    canMigrate: isConfirmada && (status === 'pending' || status === 'error'),
    canRetry: isConfirmada && status === 'error',
  };
}

// Hook para la página de migración que devuelve la estructura esperada
export function useMigrationStatusPage(filters: {
  estado?: 'pendiente' | 'sincronizado' | 'error' | undefined;
  limit: number;
  page: number;
}) {
  // Simular datos de migración para la página
  const mockData = {
    data: {
      data: [
        {
          id: '1',
          numero_orden: 'ORD-001',
          estado: 'confirmada',
          total: 150000,
          fecha_creacion: '2024-01-15T10:30:00Z',
          tns_sincronizado: 'sincronizado',
          tns_kardex_id: 'KARDEX-001',
        },
        {
          id: '2',
          numero_orden: 'ORD-002',
          estado: 'pendiente',
          total: 75000,
          fecha_creacion: '2024-01-15T11:15:00Z',
          tns_sincronizado: 'pendiente',
          tns_kardex_id: null,
        },
        {
          id: '3',
          numero_orden: 'ORD-003',
          estado: 'en_proceso',
          total: 200000,
          fecha_creacion: '2024-01-15T12:00:00Z',
          tns_sincronizado: 'error',
          tns_kardex_id: 'KARDEX-003',
        },
      ],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: 3,
        totalPages: 1,
      },
    },
  };

  return {
    data: mockData,
    isLoading: false,
    error: null,
  };
}
