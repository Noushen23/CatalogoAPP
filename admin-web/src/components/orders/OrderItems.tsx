import React from "react";
import { AdminOrderDetail } from "@/lib/admin-orders";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

interface Props {
  order: AdminOrderDetail;
}

const OrderItems: React.FC<Props> = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBagIcon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">
          Productos ({order.items?.length || 0})
        </h2>
      </div>
      <div className="space-y-4">
        {order.items?.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBagIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {item.productName}
              </h3>
              {item.productDescription && (
                <p className="text-sm text-gray-500 mt-1">
                  {item.productDescription}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Cantidad: <span className="font-medium">{item.cantidad}</span>
              </p>
              <p className="text-base font-bold text-gray-900 mt-1">
                ${item.subtotal.toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="space-y-2 max-w-xs ml-auto">
          {order.subtotal !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ${order.subtotal.toLocaleString("es-CO")}
              </span>
            </div>
          )}
          {order.descuento !== undefined && order.descuento > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descuento:</span>
              <span className="font-medium text-red-600">
                -${order.descuento.toLocaleString("es-CO")}
              </span>
            </div>
          )}
          {order.costoEnvio !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Envío:</span>
              <span className="font-medium">
                ${order.costoEnvio.toLocaleString("es-CO")}
              </span>
            </div>
          )}
          {order.impuestos !== undefined && order.impuestos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Impuestos:</span>
              <span className="font-medium">
                ${order.impuestos.toLocaleString("es-CO")}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span className="text-green-600">
              ${order.total.toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderItems;
