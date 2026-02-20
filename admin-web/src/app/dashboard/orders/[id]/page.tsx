'use client';

import React, { use } from 'react';
import OrderDetail from '@/components/orders/OrderDetail';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAdminOrder } from '@/hooks/useAdminOrders';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { refetch, isLoading } = useAdminOrder(id);
  
  return (
    <div className="space-y-6">
      {/* Botón de regreso y actualizar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Volver a Pedidos</span>
        </Link>
        
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <ArrowPathIcon 
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </button>
      </div>

      {/* Componente de detalle del pedido */}
      <OrderDetail orderId={id} />
    </div>
  );
}

