'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminOrdersService, AdminOrder, OrderStatus } from '@/lib/admin-orders';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CheckCircle, Clock, Loader2, RefreshCw, Truck, XCircle, Package } from 'lucide-react';

const statusConfig: Record<OrderStatus, { text: string; color: string; icon: React.ElementType }> = {
  pendiente: { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmada: { text: 'Confirmada', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  en_proceso: { text: 'En Proceso', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Loader2 },
  enviada: { text: 'Enviada', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Truck },
  entregada: { text: 'Entregada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cancelada: { text: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  reembolsada: { text: 'Reembolsada', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: RefreshCw },
};

export function OrdersTable() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Query para obtener los pedidos
  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: AdminOrdersService.getAllOrders,
  });

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) =>
      AdminOrdersService.updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      // Invalidar la query de pedidos para refrescar la tabla
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err) => {
      alert(`Error al actualizar el pedido: ${err.message}`);
    },
  });

  const handleConfirmOrder = (orderId: string) => {
    if (confirm('¿Estás seguro de que quieres confirmar este pedido?')) {
      updateStatusMutation.mutate({ orderId, newStatus: 'confirmada' });
    }
  };

  const orders = response?.data?.orders || [];
  const totalOrders = response?.data?.pagination?.total || 0;

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.estado === statusFilter);

  // Contar pedidos por estado
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.estado] = (acc[order.estado] || 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 font-medium">Cargando pedidos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex items-start">
          <XCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold text-lg">Error al cargar pedidos</h3>
            <p className="text-red-700 mt-1">
              {error instanceof Error ? error.message : 'No se pudieron cargar los pedidos. Por favor, intenta nuevamente.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
              <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <Package className="h-10 w-10 text-blue-500 opacity-80" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{ordersByStatus.pendiente || 0}</p>
            </div>
            <Clock className="h-10 w-10 text-yellow-500 opacity-80" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enviadas</p>
              <p className="text-3xl font-bold text-gray-900">{ordersByStatus.enviada || 0}</p>
            </div>
            <Truck className="h-10 w-10 text-indigo-500 opacity-80" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Entregadas</p>
              <p className="text-3xl font-bold text-gray-900">{ordersByStatus.entregada || 0}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {/* Filtros y controles */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                Filtrar por estado:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                className="block rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
              >
                <option value="all">Todos ({totalOrders})</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.text} ({ordersByStatus[status as OrderStatus] || 0})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.estado];
                const Icon = status.icon;
                const isUpdating = updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id;
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.numeroOrden}</div>
                      <div className="text-sm text-gray-500">{order.itemsCount} {order.itemsCount === 1 ? 'item' : 'items'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {order.usuario?.nombreCompleto || 'Usuario no disponible'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.usuario?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(order.fechaCreacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        <Icon className="h-3 w-3 mr-1.5" />
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {order.estado === 'pendiente' && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
                          disabled={isUpdating}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} className="mr-2" />
                              Confirmar
                            </>
                          )}
                        </button>
                      )}
                      {order.estado !== 'pendiente' && (
                        <span className="text-xs text-gray-400 italic">Sin acciones disponibles</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mensaje de lista vacía */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-16 px-6">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
            <p className="text-sm text-gray-500">
              {statusFilter === 'all' 
                ? 'Aún no hay pedidos en el sistema.'
                : `No se encontraron pedidos con el estado "${statusConfig[statusFilter as OrderStatus]?.text}".`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

