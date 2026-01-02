'use client';

import { useRepartidor } from '@/hooks/useRepartidores';
import { Truck, Mail, Phone, MapPin, CheckCircle, XCircle, Package, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface DetalleRepartidorProps {
  repartidorId: string;
}

export function DetalleRepartidor({ repartidorId }: DetalleRepartidorProps) {
  const { data: repartidor, isLoading, error } = useRepartidor(repartidorId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !repartidor) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar el repartidor</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{repartidor.nombre_completo}</h2>
              <p className="text-gray-500">{repartidor.email}</p>
            </div>
          </div>
          {repartidor.activo ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <XCircle className="h-4 w-4 mr-1" />
              Inactivo
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{repartidor.email}</p>
            </div>
          </div>
          {repartidor.telefono && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="text-sm font-medium text-gray-900">{repartidor.telefono}</p>
              </div>
            </div>
          )}
          {repartidor.direccion && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="text-sm font-medium text-gray-900">{repartidor.direccion}</p>
              </div>
            </div>
          )}
          {repartidor.numero_identificacion && (
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Identificación</p>
                <p className="text-sm font-medium text-gray-900">
                  {repartidor.tipo_identificacion} {repartidor.numero_identificacion}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Entregas</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Package className="h-6 w-6 mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{repartidor.estadisticas.total_entregas}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-900">{repartidor.estadisticas.entregas_en_curso}</p>
            <p className="text-sm text-blue-600">En Curso</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-900">{repartidor.estadisticas.entregas_completadas}</p>
            <p className="text-sm text-green-600">Completadas</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-900">{repartidor.estadisticas.entregas_canceladas}</p>
            <p className="text-sm text-red-600">Canceladas</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <AlertCircle className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold text-orange-900">{repartidor.estadisticas.entregas_fallidas}</p>
            <p className="text-sm text-orange-600">Fallidas</p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Link
          href={`/dashboard/repartidores/historial?repartidorId=${repartidorId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ver Historial de Pedidos
        </Link>
        <Link
          href="/dashboard/repartidores"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Volver a la Lista
        </Link>
      </div>
    </div>
  );
}

