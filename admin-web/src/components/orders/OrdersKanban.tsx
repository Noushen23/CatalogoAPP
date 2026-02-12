'use client';

import { useState } from 'react';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { OrderStatus, OrderFilters } from '@/lib/admin-orders';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  EyeIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface KanbanOrder {
  id: string;
  numeroOrden: string;
  estado: OrderStatus;
  usuario: {
    nombreCompleto: string;
    email: string;
  };
  total: number;
  fechaCreacion: string;
  direccionEnvio?: {
    ciudad: string;
    departamento: string;
  };
}

interface StatusColumn {
  id: OrderStatus;
  title: string;
  color: string;
  bgColor: string;
  description: string;
}

const statusColumns: StatusColumn[] = [
  {
    id: 'pendiente',
    title: 'Pendiente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    description: 'Migrar tercero primero'
  },
  {
    id: 'confirmada',
    title: 'Confirmada',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Tercero migrado - Migrar a TNS'
  },
  {
    id: 'en_proceso',
    title: 'En Proceso',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Migrado a TNS - Preparando'
  },
  {
    id: 'enviada',
    title: 'Enviada',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'En camino al cliente'
  },
  {
    id: 'entregada',
    title: 'Entregada',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Entregada exitosamente'
  },
  {
    id: 'cancelada',
    title: 'Cancelada',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Pedido cancelado'
  }
];

export default function OrdersKanban() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const skeletonItems = Array.from({ length: 3 }, (_, idx) => ({
    id: `skeleton-${idx}`,
  }))
  const [filters, setFilters] = useState<OrderFilters>({
    limit: 100,
    offset: 0,
    orderBy: 'fecha_creacion',
    orderDir: 'DESC',
  });

  const { data, isLoading, error, refetch } = useAdminOrders(filters);

  const orders = data?.data?.orders || [];

  // Filtrar órdenes localmente por término de búsqueda
  const filteredOrders = orders.filter(order => 
    order.numeroOrden.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.usuario?.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.usuario?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar órdenes por estado
  const ordersByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = filteredOrders.filter(order => order.estado === column.id);
    return acc;
  }, {} as Record<OrderStatus, KanbanOrder[]>);

  const handleFilterChange = (key: keyof OrderFilters, value: OrderFilters[keyof OrderFilters]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      offset: 0,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      limit: 100,
      offset: 0,
      orderBy: 'fecha_creacion',
      orderDir: 'DESC',
    });
    setSearchTerm('');
  };

  // const handleOrderStatusChange = (orderId: string, newStatus: OrderStatus) => {
  //   // Refrescar datos después del cambio
  //   refetch();
  // };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar los pedidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Vista Kanban de Pedidos</h2>
            {orders.length > 0 && (
              <span className="text-sm text-gray-500">
                ({orders.length} total)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Búsqueda */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            
            {/* Botón de refrescar */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>

        {/* Panel de Filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={filters.metodoPago || ''}
                  onChange={(e) => handleFilterChange('metodoPago', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="pse">PSE</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia_transfer">Bancolombia</option>
                </select>
              </div>

              {/* Filtro por fecha desde */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.fechaDesde || ''}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtro por fecha hasta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.fechaHasta || ''}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Botón limpiar */}
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vista Kanban */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {statusColumns.map((column) => (
            <div key={column.id} className="bg-white rounded-lg shadow p-4">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  {skeletonItems.map((item) => (
                    <div key={item.id} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {statusColumns.map((column) => {
            const columnOrders = ordersByStatus[column.id];
            
            return (
              <div key={column.id} className="bg-white rounded-lg shadow">
                {/* Header de la columna */}
                <div className={`p-4 rounded-t-lg ${column.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${column.color}`}>
                      {column.title}
                    </h3>
                    <span className={`text-sm px-2 py-1 rounded-full ${column.color} bg-white bg-opacity-50`}>
                      {columnOrders.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {column.description}
                  </p>
                </div>

                {/* Lista de órdenes */}
                <div className="p-4 space-y-3 min-h-[200px]">
                  {columnOrders.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-sm">No hay pedidos</div>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {order.numeroOrden}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {order.usuario?.nombreCompleto || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              ${order.total.toLocaleString('es-CO')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-2">
                          {format(new Date(order.fechaCreacion), "dd MMM, HH:mm", { locale: es })}
                        </div>
                        
                        {order.direccionEnvio && (
                          <div className="text-xs text-gray-500">
                            📍 {order.direccionEnvio.ciudad}, {order.direccionEnvio.departamento}
                          </div>
                        )}
                        
                        {/* Botón para ver detalles */}
                        <div className="mt-2">
                          <button
                            onClick={() => window.open(`/dashboard/orders/${order.id}`, '_blank')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <EyeIcon className="h-3 w-3" />
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Información de sincronización */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-900 mb-1">
              Sincronización Automática
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Confirmación:</span> Al confirmar un pedido, el cliente se sincroniza automáticamente con el sistema externo TNS.
              </p>
              <p className="text-xs text-blue-700">
                Los pedidos confirmados muestran el indicador de sincronización exitosa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
