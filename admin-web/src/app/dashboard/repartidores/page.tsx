'use client';

import { useState } from 'react';
import { TablaRepartidores } from '@/components/repartidores/TablaRepartidores';
import { useEstadisticasRepartidores } from '@/hooks/useRepartidores';
import { Truck, Users, Package, CheckCircle, Search } from 'lucide-react';

export default function RepartidoresPage() {
  const [search, setSearch] = useState('');
  const [activo, setActivo] = useState<string>('');

  const { data: estadisticas } = useEstadisticasRepartidores();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Repartidores</h1>
        <p className="text-gray-600 mt-1">Gestiona y visualiza información de repartidores</p>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Repartidores</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total_repartidores}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.repartidores_activos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Entregas</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total_entregas}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En Curso</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.entregas_en_curso}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={activo}
              onChange={(e) => setActivo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <TablaRepartidores filtros={{ search, activo }} />
    </div>
  );
}


















