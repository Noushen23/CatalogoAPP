'use client';

import clsx from 'clsx';
import { Loader2, MapPin, Package, Clock, User, Truck, CheckCircle } from 'lucide-react';
import { PedidoAsignadoAdmin } from '@/lib/delivery';

type PedidoAsignadoAdminExtended = PedidoAsignadoAdmin & {
  itemsTotal?: number;
  origen?: string;
  canal?: string;
  fuente?: string;
  canal_origen?: string;
  actualizado_por?: string;
  actualizado_por_nombre?: string;
  ultima_actualizacion_usuario?: string;
};

interface TablaPedidosAsignadosProps {
  pedidos: PedidoAsignadoAdminExtended[];
  estaCargando?: boolean;
  onSeleccionarPedido?: (pedido: PedidoAsignadoAdminExtended) => void;
  pedidoSeleccionadoId?: string | null;
}

const estadoEntregaConfig: Record<string, { label: string; color: string }> = {
  asignada: { label: 'Asignada', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  en_camino: { label: 'En Camino', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  llegada: { label: 'Llegada', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  entregada: { label: 'Entregada', color: 'bg-green-100 text-green-800 border-green-200' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
  fallida: { label: 'Fallida', color: 'bg-red-100 text-red-800 border-red-200' },
};

const estadoOrdenConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
  confirmada: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  en_proceso: { label: 'En Proceso', color: 'bg-purple-100 text-purple-800' },
  enviada: { label: 'Enviada', color: 'bg-indigo-100 text-indigo-800' },
  entregada: { label: 'Entregada', color: 'bg-green-100 text-green-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  reembolsada: { label: 'Reembolsada', color: 'bg-gray-100 text-gray-800' },
};

const prioridadConfig: Record<string, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Media', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  baja: { label: 'Baja', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export function TablaPedidosAsignados({
  pedidos,
  estaCargando,
  onSeleccionarPedido,
  pedidoSeleccionadoId,
}: TablaPedidosAsignadosProps) {
  if (estaCargando) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 bg-white text-center p-8 rounded-2xl border border-gray-200">
        <Package className="h-12 w-12 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">No hay pedidos asignados</p>
        <p className="text-xs text-gray-500 mt-1">Los pedidos asignados a repartidores aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-300 bg-white/95 shadow-lg shadow-gray-100">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pedido
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ítems
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-purple-600 bg-purple-50">
              Repartidor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Dirección
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Origen
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estado Pedido
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estado Entrega
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Prioridad
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fecha Asignación
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Última Actualización
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pedidos.map((pedido, index) => {
            const estadoEntrega = estadoEntregaConfig[pedido.entrega_estado] || {
              label: pedido.entrega_estado,
              color: 'bg-gray-100 text-gray-800 border-gray-200',
            };
            const estadoOrden = estadoOrdenConfig[pedido.orden_estado] || {
              label: pedido.orden_estado,
              color: 'bg-gray-100 text-gray-800',
            };
            const prioridad = pedido.prioridad
              ? prioridadConfig[pedido.prioridad] || { label: pedido.prioridad, color: 'bg-gray-100 text-gray-700 border-gray-200' }
              : null;
            // Usar una combinación única: id del pedido + entrega_id + index para garantizar unicidad
            const rowKey = `${pedido.id}-${pedido.entrega_id || 'no-entrega'}-${index}`;
            const itemsCount = pedido.items_count ?? pedido.itemsTotal ?? 0;
            const origenPedido =
              pedido.origen ||
              pedido.canal ||
              pedido.fuente ||
              pedido.canal_origen ||
              null;
            const origenLabel = origenPedido
              ? String(origenPedido).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : null;
            const ultimoActualizador =
              pedido.actualizado_por ||
              pedido.actualizado_por_nombre ||
              pedido.ultima_actualizacion_usuario ||
              null;
            const fechaActualizacion = pedido.fecha_actualizacion
              ? new Date(pedido.fecha_actualizacion).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <tr
                key={rowKey}
                className={clsx(
                  'transition',
                  onSeleccionarPedido && 'cursor-pointer hover:bg-blue-50',
                  pedidoSeleccionadoId === pedido.id && 'bg-blue-50'
                )}
                onClick={() => onSeleccionarPedido?.(pedido)}
              >
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  <div className="flex flex-col">
                    <span>#{pedido.numero_orden}</span>
                    <span className="text-xs font-normal text-gray-500">
                        Creado {new Date(pedido.fecha_creacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{pedido.usuario_nombre || '—'}</span>
                    <span className="text-xs text-gray-500">{pedido.usuario_email}</span>
                    {pedido.telefono && (
                      <span className="text-xs text-gray-500">{pedido.telefono}</span>
                    )}
                  </div>
                </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{itemsCount}</span>
                  </td>
                <td className="px-4 py-3 text-sm bg-purple-50">
                  {pedido.repartidor_nombre ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-lg bg-purple-100 px-2.5 py-1.5 border border-purple-200">
                        <Truck className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-purple-700">{pedido.repartidor_nombre}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-gray-600">Sin asignar</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex flex-col max-w-xs">
                    {pedido.nombre_destinatario && (
                      <span className="font-medium text-gray-900">{pedido.nombre_destinatario}</span>
                    )}
                    {pedido.direccion && (
                      <span className="text-xs text-gray-600 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{pedido.direccion}</span>
                      </span>
                    )}
                    {(pedido.ciudad || pedido.departamento) && (
                      <span className="text-xs text-gray-500">
                        {pedido.ciudad}
                        {pedido.ciudad && pedido.departamento && ', '}
                        {pedido.departamento}
                      </span>
                    )}
                  </div>
                </td>
                  <td className="px-4 py-3 text-sm">
                    {origenLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                        {origenLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                <td className="px-4 py-3 text-sm">
                  <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', estadoOrden.color)}>
                    {estadoOrden.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', estadoEntrega.color)}>
                    <Truck className="h-3.5 w-3.5" />
                    {estadoEntrega.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {prioridad ? (
                    <span className={clsx('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold', prioridad.color)}>
                      <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                      {prioridad.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">
                    ${pedido.total.toLocaleString('es-CO')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(pedido.fecha_asignacion).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {ultimoActualizador || fechaActualizacion ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-gray-900">
                          {ultimoActualizador || 'Usuario no especificado'}
                        </span>
                        {fechaActualizacion && <span className="text-xs text-gray-500">{fechaActualizacion}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sin registros</span>
                    )}
                  </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

