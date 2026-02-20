import React from "react";
import { AdminOrderDetail } from "@/lib/admin-orders";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

interface Props {
  order: AdminOrderDetail;
}

const OrderNotes: React.FC<Props> = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">
          Notas y Comentarios
        </h2>
      </div>
      {order.notas ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Notas del Pedido
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {order.notas}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <DocumentDuplicateIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay notas para este pedido</p>
        </div>
      )}
    </div>
  );
};

export default OrderNotes;
