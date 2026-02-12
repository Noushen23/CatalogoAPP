'use client';

import { useOrderStats } from '@/hooks/useAdminOrders';
import { useDashboard } from '@/hooks/useDashboard';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

export default function ActivityFeed() {
  const { data: orderStats } = useOrderStats();
  const { stats } = useDashboard();

  const activities = [
    {
      icon: ClockIcon,
      color: 'bg-yellow-100 text-yellow-600',
      title: 'Pedidos Pendientes',
      count: orderStats?.data?.pendingOrders || 0,
      description: 'Requieren atención',
      action: 'Ver pedidos',
      href: '/dashboard/orders?estado=pendiente',
    },
    {
      icon: ExclamationTriangleIcon,
      color: 'bg-red-100 text-red-600',
      title: 'Stock Bajo',
      count: stats?.lowStockProducts || 0,
      description: 'Productos con bajo inventario',
      action: 'Revisar',
      href: '/dashboard/products',
    },
    {
      icon: TruckIcon,
      color: 'bg-blue-100 text-blue-600',
      title: 'En Envío',
      count: orderStats?.data?.shippedOrders || 0,
      description: 'Pedidos en camino',
      action: 'Ver detalles',
      href: '/dashboard/orders?estado=enviada',
    },
    {
      icon: CheckCircleIcon,
      color: 'bg-green-100 text-green-600',
      title: 'Entregados Hoy',
      count: orderStats?.data?.deliveredOrders || 0,
      description: 'Pedidos completados',
      action: 'Ver reporte',
      href: '/dashboard/orders?estado=entregada',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`${activity.color} p-2 rounded-lg`}>
                <activity.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{activity.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

