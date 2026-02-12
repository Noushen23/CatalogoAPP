'use client';

import { useOrderStats } from '@/hooks/useAdminOrders';
import { TrendingUpIcon } from 'lucide-react';
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

export default function SalesOverview() {
  const { data, isLoading } = useOrderStats();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="animate-pulse">
          <div className="h-6 bg-blue-400 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-blue-400 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-blue-400 rounded"></div>
            <div className="h-16 bg-blue-400 rounded"></div>
            <div className="h-16 bg-blue-400 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const salesData = [
    {
      label: 'Pedidos Totales',
      value: stats?.totalOrders || 0,
      icon: ShoppingCartIcon,
    },
    {
      label: 'Ticket Promedio',
      value: `$${(stats?.averageOrderValue || 0).toLocaleString('es-CO')}`,
      icon: CalculatorIcon,
    },
    {
      label: 'Tasa de Éxito',
      value: stats?.totalOrders 
        ? `${Math.round(((stats.deliveredOrders || 0) / stats.totalOrders) * 100)}%`
        : '0%',
      icon: TrendingUpIcon,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <CurrencyDollarIcon className="h-8 w-8" />
        <div>
          <h3 className="text-lg font-semibold">Resumen de Ventas</h3>
          <p className="text-blue-100 text-sm">Métricas generales</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-blue-100 mb-1">Ingresos Totales</p>
        <p className="text-4xl font-bold">
          ${(stats?.totalRevenue || 0).toLocaleString('es-CO')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {salesData.map((item) => (
          <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="h-4 w-4 text-blue-100" />
              <p className="text-xs text-blue-100">{item.label}</p>
            </div>
            <p className="text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

