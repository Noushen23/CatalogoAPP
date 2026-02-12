'use client';

import { useState } from 'react';
import { useRepartidores } from '@/hooks/useRepartidores';
import { Repartidor } from '@/lib/repartidores';
import { Truck, Phone, MapPin, CheckCircle, XCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface TablaRepartidoresProps {
  filtros?: {
    search?: string;
    activo?: string;
  };
}

export function TablaRepartidores({ filtros }: TablaRepartidoresProps) {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, error } = useRepartidores({
    ...filtros,
    page,
    limit,
    sortBy: 'nombre',
    sortOrder: 'ASC',
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar repartidores</p>
      </div>
    );
  }

  if (!data || data.repartidores.length === 0) {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">No hay repartidores registrados</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Repartidor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estadísticas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.repartidores.map((repartidor) => (
              <RepartidorRow key={repartidor.id} repartidor={repartidor} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data.pagination.totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, data.pagination.total)} de {data.pagination.total} repartidores
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RepartidorRow({ repartidor }: { repartidor: Repartidor }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Truck className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{repartidor.nombre_completo}</div>
            <div className="text-sm text-gray-500">{repartidor.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 space-y-1">
          {repartidor.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{repartidor.telefono}</span>
            </div>
          )}
          {repartidor.direccion && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="truncate max-w-xs">{repartidor.direccion}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm space-y-1">
          <div className="text-gray-900 font-medium">Total: {repartidor.total_entregas}</div>
          <div className="text-green-600">Completadas: {repartidor.entregas_completadas}</div>
          <div className="text-blue-600">En curso: {repartidor.entregas_en_curso}</div>
          <div className="text-red-600">Canceladas: {repartidor.entregas_canceladas}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {repartidor.activo ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Inactivo
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={`/dashboard/repartidores/${repartidor.id}`}
          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          Ver
        </Link>
      </td>
    </tr>
  );
}


















