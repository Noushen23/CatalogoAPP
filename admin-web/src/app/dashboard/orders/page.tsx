import React from 'react';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Package } from 'lucide-react';

export const metadata = {
  title: 'Gestión de Pedidos',
  description: 'Administra todos los pedidos de los clientes',
};

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-600 mt-2">
            Visualiza y administra todos los pedidos de los clientes. Confirma pedidos pendientes y monitorea el estado de cada orden.
          </p>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <OrdersTable />
    </div>
  );
}

