'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiAlt } from '@/lib/api';
import { Package, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HistorialPedidosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repartidorId = searchParams.get('repartidorId') || '';
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['historial-pedidos-repartidor', repartidorId, page],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append('repartidorId', repartidorId);
        params.append('page', page.toString());
        params.append('limit', '20');
        const response = await apiAlt.get(`/repartidores/historial?${params.toString()}`);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al obtener historial');
        }
        
        return response.data.data || { pedidos: [], estadisticas: {}, pagination: {} };
      } catch (err) {
        console.error('Error en query historial:', err);
        const responseMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar el historial';
        throw new Error(responseMessage || errorMessage);
      }
    },
    enabled: !!repartidorId,
  });

  if (!repartidorId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Se requiere el parámetro repartidorId</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => {
                  if (repartidorId) {
                    router.push(`/dashboard/repartidores/${repartidorId}`);
                  } else {
                    router.push('/dashboard/repartidores');
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Historial de Pedidos</h1>
            </div>
            <p className="text-gray-600 ml-11">Pedidos asignados al repartidor</p>
          </div>
          <Link
            href={repartidorId ? `/dashboard/repartidores/${repartidorId}` : '/dashboard/repartidores'}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error al cargar el historial</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                if (repartidorId) {
                  router.push(`/dashboard/repartidores/${repartidorId}`);
                } else {
                  router.push('/dashboard/repartidores');
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Pedidos</h1>
          </div>
          <p className="text-gray-600 ml-11">Pedidos asignados al repartidor</p>
        </div>
        <Link
          href={repartidorId ? `/dashboard/repartidores/${repartidorId}` : '/dashboard/repartidores'}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      {data?.estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Pedidos</p>
            <p className="text-2xl font-bold text-gray-900">{data.estadisticas.total_pedidos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">Entregados</p>
            <p className="text-2xl font-bold text-green-600">{data.estadisticas.entregados}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">En Curso</p>
            <p className="text-2xl font-bold text-blue-600">{data.estadisticas.en_curso}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Entregado</p>
            <p className="text-2xl font-bold text-purple-600">
              ${new Intl.NumberFormat('es-CO').format(data.estadisticas.total_entregado)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.pedidos && data.pedidos.length > 0 ? (
                data.pedidos.map((pedido: { 
                  entrega_id: string; 
                  numero_orden?: string; 
                  usuario_nombre?: string; 
                  usuario_email?: string; 
                  direccion?: string; 
                  ciudad?: string; 
                  departamento?: string; 
                  entrega_estado?: string; 
                  total?: number; 
                  fecha_asignacion?: string; 
                }) => (
                  <tr key={pedido.entrega_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">#{pedido.numero_orden}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{pedido.usuario_nombre || '—'}</div>
                      <div className="text-sm text-gray-500">{pedido.usuario_email || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{pedido.direccion || '—'}</div>
                      <div className="text-sm text-gray-500">
                        {pedido.ciudad && pedido.departamento ? `${pedido.ciudad}, ${pedido.departamento}` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pedido.entrega_estado === 'entregada' ? 'bg-green-100 text-green-800' :
                        pedido.entrega_estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                        pedido.entrega_estado === 'fallida' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pedido.entrega_estado || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          ${new Intl.NumberFormat('es-CO').format(pedido.total || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.fecha_asignacion 
                        ? new Date(pedido.fecha_asignacion).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">No hay pedidos en el historial</p>
                    <p className="text-gray-500 text-sm mt-1">Este repartidor aún no tiene pedidos asignados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

