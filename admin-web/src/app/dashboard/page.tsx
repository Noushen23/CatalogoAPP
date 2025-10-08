'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/hooks/useDashboard';
import { 
  Package, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';


// Componente para mostrar métricas básicas
const MetricCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  isLoading = false 
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-[80px] mb-1" />
          <Skeleton className="h-3 w-[120px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};


// Componente principal del Dashboard
export default function DashboardPage() {
  const { stats, isLoading, isError, error } = useDashboard();

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar el dashboard</h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Resumen general de productos y métricas básicas
          </p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Productos"
          value={stats?.totalProducts?.toString() || '0'}
          description="Productos en el catálogo"
          icon={Package}
          isLoading={isLoading}
        />
        <MetricCard
          title="Productos Activos"
          value={stats?.activeProducts?.toString() || '0'}
          description="Productos disponibles para venta"
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <MetricCard
          title="Stock Bajo"
          value={stats?.lowStockProducts?.toString() || '0'}
          description="Productos con stock menor a 10"
          icon={AlertTriangle}
          isLoading={isLoading}
        />
      </div>

      {/* Estado del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Estado del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">Base de datos: Conectada</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}