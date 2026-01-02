'use client';

// React
import React from 'react';

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Hooks
import { useDashboard } from '@/hooks/useDashboard';

// Componentes del Dashboard
import OrderStatsCards from '@/components/orders/OrderStatsCards';
import RecentOrdersTable from '@/components/orders/RecentOrdersTable';
import QuickActions from '@/components/dashboard/QuickActions';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import SalesOverview from '@/components/dashboard/SalesOverview';

// Iconos
import { 
  Package, 
  AlertTriangle,
  CheckCircle,
  TrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from 'lucide-react';

// ==================== Componentes Auxiliares ====================
interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
  trend?: 'up' | 'down';
  trendValue?: string;
}

// Componente para mostrar métricas mejoradas
const MetricCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  isLoading = false,
  trend,
  trendValue
}: MetricCardProps) => {
  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <div className="bg-blue-50 p-2 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {trend && trendValue && (
            <div className={`flex items-center text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};

// ==================== Componente Principal ====================
export default function DashboardPage() {
  // ==================== Hooks ====================
  const { stats, isLoading, isError, error } = useDashboard();

  // ==================== Manejo de Errores ====================
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

  // ==================== Render ====================
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            ¡Bienvenido de nuevo! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Aquí está el resumen de tu negocio hoy, {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-5 py-3 rounded-lg border border-green-200 shadow-sm">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Sistema operativo</span>
          </div>
        </div>
      </div>

      {/* Resumen de Ventas */}
      <SalesOverview />

      {/* Acciones Rápidas */}
      <QuickActions />

      {/* Métricas de Productos */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          Inventario de Productos
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
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
            description="Disponibles para venta"
            icon={CheckCircle}
            isLoading={isLoading}
            trend="up"
            trendValue="100%"
          />
          <MetricCard
            title="Stock Bajo"
            value={stats?.lowStockProducts?.toString() || '0'}
            description="Requieren reposición"
            icon={AlertTriangle}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Columna Principal */}
        <div className="xl:col-span-2 space-y-8">
          {/* Estadísticas de Pedidos */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-blue-600" />
              </div>
              Estadísticas de Pedidos
            </h2>
            <OrderStatsCards />
          </div>

          {/* Pedidos Recientes */}
          <RecentOrdersTable limit={5} />
        </div>

        {/* Columna Lateral */}
        <div className="space-y-8">
          {/* Actividad Reciente */}
          <ActivityFeed />

          {/* Estado del Sistema */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-900 text-lg">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-800">Base de datos</span>
                </div>
                <span className="text-xs text-green-600 font-bold">Conectada</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-800">API Backend</span>
                </div>
                <span className="text-xs text-blue-600 font-bold">Activa</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-800">Última actualización</span>
                </div>
                <span className="text-xs text-purple-600 font-bold">
                  {new Date().toLocaleTimeString('es-ES')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}