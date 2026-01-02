import React from 'react';
import OrderDetail from '@/components/orders/OrderDetail';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const metadata = {
  title: 'Detalle del Pedido',
  description: 'Ver y gestionar detalles de un pedido específico',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="space-y-6">
      {/* Botón de regreso */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span className="font-medium">Volver a Pedidos</span>
      </Link>

      {/* Componente de detalle del pedido */}
      <OrderDetail orderId={id} />
    </div>
  );
}

