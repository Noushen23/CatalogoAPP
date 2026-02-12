"use client";

import { useState } from "react";
import { DeliveryService } from "@/lib/delivery";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  UserIcon,
  DocumentTextIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";

interface OrderProcessConditionsProps {
  order: {
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
  };
  onUpdate?: () => void;
}

export default function OrderProcessConditions({
  order,
  onUpdate,
}: OrderProcessConditionsProps) {
  const [isMarkingAsLoaded, setIsMarkingAsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const queryClient = useQueryClient();

  // Verificar condiciones
  const condiciones = {
    terceroEnTNS: !!order.tercero_id,
    pedidoEnTNS: !!order.tns_kardex_id,
    repartidorAsignado: !!order.entrega?.id && !!order.entrega?.repartidor_id,
    montadoAlCarro: order.montado_carro === 1 || order.montado_carro === true,
  };

  const todasCumplidas =
    condiciones.terceroEnTNS &&
    condiciones.pedidoEnTNS &&
    condiciones.repartidorAsignado &&
    condiciones.montadoAlCarro;

  const puedeEstarEnProceso =
    order.estado === "confirmada" || order.estado === "en_proceso";

  const handleMarcarMontadoAlCarro = async () => {
    if (!puedeEstarEnProceso) {
      toast.error("Solo los pedidos confirmados pueden marcarse como montados al carro");
      return;
    }

    setIsMarkingAsLoaded(true);
    try {
      const resultado = await DeliveryService.marcarPedidoMontadoAlCarro(order.id);

      if (resultado.estadoActualizado) {
        toast.success("✅ Pedido marcado como montado al carro y estado actualizado a 'En Proceso'");
      } else {
        toast.success("✅ Pedido marcado como montado al carro");
          if (resultado.razon) {
            toast.error(`ℹ️ ${resultado.razon}`, { duration: 5000 });
          }
      }

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error al marcar pedido como montado al carro:", error);
      const message = error instanceof Error ? error.message : "Error al marcar pedido como montado al carro";
      toast.error(message);
    } finally {
      setIsMarkingAsLoaded(false);
    }
  };

  const handleVerificarEstado = async () => {
    setIsVerifying(true);
    try {
      const resultado = await DeliveryService.verificarYActualizarEstadoEnProceso(order.id);

      if (resultado.actualizado) {
        toast.success(`✅ Estado actualizado a '${resultado.nuevoEstado}'`);
      } else {
        if (resultado.razon) {
          toast.error(`ℹ️ ${resultado.razon}`, { duration: 5000 });
        } else {
          toast.error("ℹ️ El pedido aún no cumple todas las condiciones para estar en proceso");
        } 
      }

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error al verificar estado:", error);
      const message = error instanceof Error ? error.message : "Error al verificar estado";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!puedeEstarEnProceso) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Condiciones para &quot;En Proceso&quot;
        </h3>
        {todasCumplidas && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircleIconSolid className="w-4 h-4" />
            Todas cumplidas
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Condición 1: Tercero en TNS */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            condiciones.terceroEnTNS
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {condiciones.terceroEnTNS ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-gray-900">
                1. Tercero creado en TNS
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {condiciones.terceroEnTNS
                ? `Tercero ID: ${order.tercero_id}`
                : "El tercero debe estar creado en el sistema TNS"}
            </p>
          </div>
        </div>

        {/* Condición 2: Pedido en TNS */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            condiciones.pedidoEnTNS
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {condiciones.pedidoEnTNS ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-gray-900">
                2. Pedido en TNS
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {condiciones.pedidoEnTNS
                ? `Kardex ID: ${order.tns_kardex_id}`
                : "El pedido debe estar migrado al sistema TNS"}
            </p>
          </div>
        </div>

        {/* Condición 3: Repartidor asignado */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            condiciones.repartidorAsignado
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {condiciones.repartidorAsignado ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-gray-900">
                3. Repartidor asignado
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {condiciones.repartidorAsignado
                ? "Un repartidor ha sido asignado al pedido"
                : "Debe asignarse un repartidor al pedido"}
            </p>
          </div>
        </div>

        {/* Condición 4: Montado al carro */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            condiciones.montadoAlCarro
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {condiciones.montadoAlCarro ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CubeIcon className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-gray-900">
                4. Montado al carro
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {condiciones.montadoAlCarro
                ? "El pedido está montado en el vehículo"
                : "El pedido debe estar montado en el vehículo de entrega"}
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {!condiciones.montadoAlCarro && (
          <button
            onClick={handleMarcarMontadoAlCarro}
            disabled={isMarkingAsLoaded}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMarkingAsLoaded ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Marcando...
              </>
            ) : (
              <>
                <CubeIcon className="w-4 h-4" />
                Marcar como Montado al Carro
              </>
            )}
          </button>
        )}

        <button
          onClick={handleVerificarEstado}
          disabled={isVerifying || todasCumplidas}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isVerifying ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Verificando...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4" />
              Verificar Estado
            </>
          )}
        </button>
      </div>

      {todasCumplidas && order.estado === "confirmada" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✅ Todas las condiciones están cumplidas. El pedido puede cambiar a &quot;En Proceso&quot;.
            Haz clic en &quot;Verificar Estado&quot; para actualizarlo automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}

