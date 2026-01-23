'use client';

import { useState, useMemo } from 'react';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { AdminOrder, OrderFilters, OrderStatus, PaymentMethod } from '@/lib/admin-orders';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';


const statusColors: Record<OrderStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-blue-100 text-blue-800',
  en_proceso: 'bg-purple-100 text-purple-800',
  enviada: 'bg-indigo-100 text-indigo-800',
  entregada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  reembolsada: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_proceso: 'En Proceso',
  enviada: 'Enviada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  reembolsada: 'Reembolsada',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  tarjeta: 'Tarjeta',
  pse: 'PSE',
  nequi: 'Nequi',
  bancolombia_transfer: 'Bancolombia',
};

const ORDER_SORTABLE_FIELDS = [
  'numero_orden',
  'usuario_id',
  'estado',
  'total',
  'fecha_creacion',
] as const;
type OrderSortField = typeof ORDER_SORTABLE_FIELDS[number];

export default function OrdersTable() {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<OrderSortField>('fecha_creacion');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  


  


  const [filters, setFilters] = useState<OrderFilters>({
    limit: 50,
    offset: 0,
    orderBy: 'fecha_creacion',
    orderDir: 'DESC',
  });

  const { data, isLoading, error } = useAdminOrders(filters);

  // Funciones de utilidad
  // const copyToClipboard = async (text: string, label: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     toast.success(`${label} copiado al portapapeles`);
  //   } catch (error) {
  //     toast.error('Error al copiar al portapapeles');
  //   }
  // };

  // const shareOrder = async (order: AdminOrder) => {
  //   try {
  //     const message = `Pedido ${order.numeroOrden}\nCliente: ${order.usuario?.nombreCompleto || 'N/A'}\nTotal: $${order.total.toLocaleString('es-CO')}\nEstado: ${statusLabels[order.estado]}`;
      
  //     if (navigator.share) {
  //       await navigator.share({
  //         title: `Pedido ${order.numeroOrden}`,
  //         text: message,
  //       });
  //     } else {
  //       await copyToClipboard(message, 'Información del pedido');
  //     }
  //   } catch (error) {
  //     console.log('Error sharing:', error);
  //   }
  // };

  // const printOrders = () => {
  //   window.print();
  //   toast.success('Imprimiendo pedidos...');
  // };

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      offset: 0, // Reset offset when filters change
    }));
  };

  const handleSort = (field: OrderSortField) => {
    const newDirection = sortField === field && sortDirection === 'DESC' ? 'ASC' : 'DESC';
    setSortField(field);
    setSortDirection(newDirection);
    setFilters((prev) => ({
      ...prev,
      orderBy: field,
      orderDir: newDirection,
      offset: 0,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
      orderBy: 'fecha_creacion',
      orderDir: 'DESC',
    });
    setSearchTerm('');
    setSortField('fecha_creacion');
    setSortDirection('DESC');
  };

  const handlePrevPage = () => {
    setFilters((prev) => ({
      ...prev,
      offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)),
    }));
  };

  const handleNextPage = () => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50),
    }));
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === uniqueOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(uniqueOrders.map(order => order.id));
    }
  };

  // Obtener órdenes y eliminar duplicados por ID
  const uniqueOrders = useMemo<AdminOrder[]>(() => {
    const orders = data?.data?.orders || [];
    const seen = new Set<string>();
    return orders.filter(order => {
      if (seen.has(order.id)) {
        return false;
      }
      seen.add(order.id);
      return true;
    });
  }, [data]);

  // Filtrar órdenes por término de búsqueda
  const filteredOrders = useMemo<AdminOrder[]>(() => {
    if (!searchTerm) return uniqueOrders;
    
    return uniqueOrders.filter(order => 
      order.numeroOrden.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.usuario?.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.usuario?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.direccionEnvio?.ciudad?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueOrders, searchTerm]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar los pedidos</p>
      </div>
    );
  }

  const orders = filteredOrders;
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header con controles mejorados */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Todos los Pedidos</h2>
            {pagination && (
              <span className="text-sm text-gray-500">
                ({pagination.total} total)
              </span>
            )}
            {selectedOrders.length > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                ({selectedOrders.length} seleccionados)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
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
            
            {/* Acciones masivas */}
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-2">
                {/* <button
                  onClick={printOrders}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="text-sm">Imprimir</span>
                </button> */}
                <button
                  onClick={() => setSelectedOrders([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Limpiar selección
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtro por estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filters.estado || ''}
                  onChange={(e) => handleFilterChange('estado', e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="enviada">Enviada</option>
                  <option value="entregada">Entregada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="reembolsada">Reembolsada</option>
                </select>
              </div>

              {/* Filtro por método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={filters.metodoPago || ''}
                  onChange={(e) => handleFilterChange('metodoPago', e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="pse">PSE</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia_transfer">Bancolombia</option>
                </select>
              </div>

              {/* Filtro por migración TNS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Migración TNS
                </label>
                <select
                  value={filters.migradoTNS === undefined ? '' : filters.migradoTNS ? 'true' : 'false'}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange('migradoTNS', value === '' ? undefined : value === 'true');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Migrados</option>
                  <option value="false">No migrados</option>
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
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de pedidos mejorada */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No se encontraron pedidos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onChange={selectAllOrders}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('numero_orden')}
                    >
                      <div className="flex items-center gap-1">
                        Número de Orden
                        {sortField === 'numero_orden' && (
                          sortDirection === 'ASC' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('usuario_id')}
                    >
                      <div className="flex items-center gap-1">
                        Cliente
                        {sortField === 'usuario_id' && (
                          sortDirection === 'ASC' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('estado')}
                    >
                      <div className="flex items-center gap-1">
                        Estado
                        {sortField === 'estado' && (
                          sortDirection === 'ASC' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Migrado TNS
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección de Envío
                    </th> */}
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center gap-1">
                        Total
                        {sortField === 'total' && (
                          sortDirection === 'ASC' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('fecha_creacion')}
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        {sortField === 'fecha_creacion' && (
                          sortDirection === 'ASC' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {order.numeroOrden}
                          {/* <button
                            onClick={() => copyToClipboard(order.numeroOrden, 'Número de pedido')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button> */}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.usuario?.nombreCompleto || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.usuario?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusColors[order.estado]
                          }`}
                        >
                          {statusLabels[order.estado]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {paymentMethodLabels[order.metodoPago as PaymentMethod] || order.metodoPago}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.tns_kardex_id ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                              Migrado
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {order.tns_kardex_id}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircleIcon className="h-3.5 w-3.5 mr-1" />
                            No migrado
                          </span>
                        )}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        {order.direccionEnvio ? (
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{order.direccionEnvio.nombreDestinatario}</div>
                            <div className="text-gray-500">{order.direccionEnvio.ciudad}, {order.direccionEnvio.departamento}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {order.direccionEnvioId ? (
                              <div>
                                <div className="text-yellow-600">Dirección no encontrada</div>
                                <div className="text-xs text-gray-400">ID: {order.direccionEnvioId}</div>
                              </div>
                            ) : (
                              'Sin dirección'
                            )}
                          </div>
                        )}
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${order.total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.fechaCreacion), "dd MMM yyyy, HH:mm", { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          {/* <button
                            onClick={() => shareOrder(order)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <ShareIcon className="h-4 w-4" />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando {(pagination.offset || 0) + 1} a{' '}
                  {Math.min((pagination.offset || 0) + (pagination.limit || 0), pagination.total)} de{' '}
                  {pagination.total} resultados
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.offset || pagination.offset === 0}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={(pagination.offset || 0) + (pagination.limit || 0) >= pagination.total}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}