import React from "react";
import { AdminOrderDetail } from "@/lib/admin-orders";
import { UserIcon, CreditCardIcon, MapPinIcon } from "@heroicons/react/24/outline";
import OrderMigrationStatus from "./OrderMigrationStatus";
import OrderProcessConditions from "./OrderProcessConditions";
import { paymentMethodLabels } from "@/components/orders/OrderDetailHelpers";
import { useQueryClient } from "@tanstack/react-query";

interface OrderConditions {
  id: string;
  estado: string;
  tercero_id?: number | null;
  tns_kardex_id?: number | null;
  montado_carro?: boolean | number;
  entrega?: {
    id: string;
    repartidor_id: string;
    estado: string;
  };
}

interface Props {
  order: AdminOrderDetail;
  orderForConditions: OrderConditions;
}

const OrderOverview: React.FC<Props> = ({ order, orderForConditions }) => {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* sincronización cliente */}
      {order.estado === "confirmada" && order.terceroSincronizado && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 mb-1">
                ✅ Cliente Sincronizado con Sistema Externo
              </h3>
              <div className="space-y-1">
                {order.terceroNombre && (
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Tercero:</span>{" "}
                    {order.terceroNombre}
                  </p>
                )}
                {order.terceroId && (
                  <p className="text-xs text-blue-700">
                    ID del Tercero:{" "}
                    <code className="bg-blue-100 px-2 py-0.5 rounded">
                      {order.terceroId}
                    </code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <OrderMigrationStatus orderId={order.id} />
        {(order.estado === "confirmada" || order.estado === "en_proceso") && (
          <OrderProcessConditions
            order={orderForConditions}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Cliente</h2>
          </div>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium text-gray-700">Nombre:</span>{" "}
              {order.usuario?.nombreCompleto || "N/A"}
            </p>
            <p className="text-sm">
              <span className="font-medium text-gray-700">Email:</span>{" "}
              {order.usuario?.email || "N/A"}
            </p>
            {order.usuario?.tipoIdentificacion && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">
                  Tipo de Identificación:
                </span>{" "}
                {order.usuario.tipoIdentificacion}
              </p>
            )}
            {order.usuario?.numeroIdentificacion && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">
                  Número de Identificación:
                </span>{" "}
                {order.usuario.numeroIdentificacion}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCardIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Pago</h2>
          </div>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium text-gray-700">Método:</span>{" "}
              {paymentMethodLabels[
                order.metodoPago as keyof typeof paymentMethodLabels
              ] || order.metodoPago}
            </p>
            {order.referenciaPago && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">
                  Referencia:
                </span>{" "}
                {order.referenciaPago}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium text-gray-700">Total:</span>{" "}
              <span className="text-lg font-bold text-green-600">
                ${order.total.toLocaleString("es-CO")}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Dirección de Envío
            </h2>
          </div>
          {order.direccionEnvio ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-gray-700">Destinatario:</span>{" "}
                {order.direccionEnvio.nombreDestinatario || "No especificado"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Teléfono:</span>{" "}
                {order.direccionEnvio.telefono || "No especificado"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Dirección:</span>{" "}
                {order.direccionEnvio.direccion || "No especificada"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Ciudad:</span>{" "}
                {order.direccionEnvio.ciudad || "No especificada"},{" "}
                {order.direccionEnvio.departamento || "No especificado"}
              </p>
              {order.direccionEnvio.codigoPostal && (
                <p>
                  <span className="font-medium text-gray-700">Código Postal:</span>{" "}
                  {order.direccionEnvio.codigoPostal}
                </p>
              )}
              {order.direccionEnvio.pais && (
                <p>
                  <span className="font-medium text-gray-700">País:</span>{" "}
                  {order.direccionEnvio.pais}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">
                No se especificó dirección de envío.
              </p>
              {order.direccionEnvioId && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <span className="font-semibold">Advertencia:</span> El
                    pedido tiene un ID de dirección asociado (<code>{order.direccionEnvioId}</code>), pero no se encontraron los detalles. Es posible que la dirección haya sido eliminada.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderOverview;
