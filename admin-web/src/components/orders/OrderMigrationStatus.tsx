'use client';

import { useState } from 'react';
import { useMigrationStatus, useMigrateOrder, useRetryMigration, MigrationOptions } from '@/hooks/useOrderMigration';
import { useUpdateOrderStatus } from '@/hooks/useAdminOrders';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

interface OrderMigrationStatusProps {
  orderId: string;
}

export default function OrderMigrationStatus({ orderId }: OrderMigrationStatusProps) {
  const {
    status,
    migrationStatus,
    orden,
    isLoading,
    error,
    canMigrate,
    canRetry
  } = useMigrationStatus(orderId);
  
  const migrateOrderMutation = useMigrateOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const retryMigrationMutation = useRetryMigration();
  
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationOptions, setMigrationOptions] = useState<MigrationOptions>({
    usuario: 'ADMIN',
    codprefijo: 'PA',
    codcomp: 'PV',
    sucid: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <p className="text-red-800 font-medium">Error al cargar estado de migración</p>
        </div>
      </div>
    );
  }

  if (!migrationStatus || !orden) return null;

  // Determinar el estado de migración
  const getMigrationStatusInfo = () => {
    switch (status) {
      case 'error':
        return {
          status: 'error',
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error de Migración',
          description: 'La migración falló. Revisa los errores y reintenta.',
        };
      case 'completed':
        return {
          status: 'completed',
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Migrado a TNS',
          description: 'La orden y todos sus items han sido migrados exitosamente.',
        };
      case 'partial':
        return {
          status: 'partial',
          icon: ExclamationTriangleIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Migración Parcial',
          description: 'La orden está migrada pero algunos items fallaron.',
        };
      default:
        return {
          status: 'pending',
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Pendiente de Migración',
          description: 'La orden aún no ha sido migrada al sistema TNS.',
        };
    }
  };

  const statusInfo = getMigrationStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleMigration = async () => {
    try {
      await migrateOrderMutation.mutateAsync({
        orderId,
        options: { ...migrationOptions },
      });
      if (orden.estado !== 'en_proceso') {
        try {
          await updateStatusMutation.mutateAsync({
            orderId,
            newStatus: 'en_proceso',
            notas: 'Pedido migrado a TNS',
          });
        } catch {
          // El hook ya maneja el toast de error.
        }
      }
      setShowMigrationModal(false);
    } catch (error) {
      console.error('Error en migración:', error);
    }
  };

  const handleRetryMigration = async () => {
    try {
      await retryMigrationMutation.mutateAsync({
        orderId,
        options: migrationOptions,
      });
    } catch (error) {
      console.error('Error al reintentar migración:', error);
    }
  };

  return (
    <>
      <div className={`rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} p-6`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`text-lg font-semibold ${statusInfo.color}`}>
                Estado de Migración TNS
              </h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">
              {statusInfo.description}
            </p>

            {/* Información de migración */}
            {orden.tns_kardex_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">KARDEX ID:</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {orden.tns_kardex_id}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Número TNS:</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {orden.tns_numero}
                    </code>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Cliente TNS:</span>
                    <span className="text-sm">{orden.CLIENTE_NOMBRE || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">NIT:</span>
                    <span className="text-sm">{orden.CLIENTE_NIT || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Estadísticas de migración */}
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{migrationStatus.totalItems}</div>
                <div className="text-xs text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{migrationStatus.itemsSincronizados}</div>
                <div className="text-xs text-gray-600">Migrados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{migrationStatus.totalItems - migrationStatus.itemsSincronizados}</div>
                <div className="text-xs text-gray-600">Pendientes</div>
              </div>
            </div>

            {/* Mensaje de error */}
            {orden.tns_error_message && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">Error de migración:</p>
                <p className="text-sm text-red-700 mt-1">{orden.tns_error_message}</p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-3">
              {canMigrate && (
                <button
                  onClick={() => {
                    setShowMigrationModal(true);
                  }}
                  disabled={migrateOrderMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CloudArrowUpIcon className="h-4 w-4" />
                  {migrateOrderMutation.isPending ? 'Migrando...' : 'Migrar a TNS'}
                </button>
              )}
              {/* Iniciar Preparación eliminado */}

              {canRetry && (
                <button
                  onClick={handleRetryMigration}
                  disabled={retryMigrationMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  {retryMigrationMutation.isPending ? 'Reintentando...' : 'Reintentar Migración'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de migración */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Migrar Orden</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  value={migrationOptions.usuario || ''}
                  onChange={(e) => setMigrationOptions(prev => ({ ...prev, usuario: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Usuario que procesa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefijo TNS
                </label>
                <input
                  type="text"
                  value={migrationOptions.codprefijo || ''}
                  onChange={(e) => setMigrationOptions(prev => ({ ...prev, codprefijo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compañía TNS
                </label>
                <input
                  type="text"
                  value={migrationOptions.codcomp || ''}
                  onChange={(e) => setMigrationOptions(prev => ({ ...prev, codcomp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PV"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sucursal ID
                </label>
                <input
                  type="number"
                  value={migrationOptions.sucid || 1}
                  onChange={(e) => setMigrationOptions(prev => ({ ...prev, sucid: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowMigrationModal(false)}
                disabled={migrateOrderMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleMigration}
                disabled={migrateOrderMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {migrateOrderMutation.isPending && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Migrar Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}