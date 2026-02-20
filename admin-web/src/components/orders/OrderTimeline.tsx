import React, { useMemo } from "react";
import { AdminOrderDetail, OrderStatus } from "@/lib/admin-orders";
import { ClockIcon, CheckCircleIcon, ArrowPathIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

interface TimelineStep {
  status: OrderStatus;
  label: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
}

interface Props {
  order: AdminOrderDetail;
}

const OrderTimeline: React.FC<Props> = ({ order }) => {
  const getTimelineConfig = () => ({
    pendiente: {
      icon: ClockIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    confirmada: {
      icon: CheckCircleIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    en_proceso: {
      icon: ArrowPathIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    enviada: {
      icon: ShoppingBagIcon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    entregada: {
      icon: CheckCircleIcon,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  } as const);

  const timeline = useMemo(() => {
    if (!order) return [] as TimelineStep[];
    const cfg = getTimelineConfig();
    const items: TimelineStep[] = [
      { status: "pendiente", label: "Pedido Recibido", description: "El pedido ha sido recibido y está pendiente de confirmación", ...cfg.pendiente },
      { status: "confirmada", label: "Pedido Confirmado", description: "El pedido ha sido confirmado y está siendo procesado", ...cfg.confirmada },
      { status: "en_proceso", label: "En Proceso", description: "El pedido cumple todas las condiciones: tercero en TNS, pedido en TNS, repartidor asignado y montado al carro", ...cfg.en_proceso },
      { status: "enviada", label: "Enviada", description: "El repartidor ha iniciado la ruta y el pedido está en camino", ...cfg.enviada },
      { status: "entregada", label: "Entregado", description: "El pedido ha sido entregado exitosamente", ...cfg.entregada },
    ];
    const currentIdx = items.findIndex((it) => it.status === order.estado);
    return items.map((it, idx) => ({
      ...it,
      isActive: idx === currentIdx,
      isCompleted: idx < currentIdx,
      isCancelled: order.estado === "cancelada" || order.estado === "reembolsada",
    }));
  }, [order]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <ClockIcon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">Timeline del Pedido</h2>
      </div>
      <div className="space-y-4">
        {timeline.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.status}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                step.isCancelled
                  ? "bg-gray-50 border-gray-200"
                  : step.isActive
                  ? `${step.bgColor} ${step.borderColor}`
                  : step.isCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.isCancelled
                    ? "bg-gray-200 text-gray-400"
                    : step.isActive
                    ? "bg-blue-600 text-white"
                    : step.isCompleted
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.isCompleted && !step.isCancelled ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    step.isCancelled
                      ? "text-gray-500"
                      : step.isActive
                      ? step.color
                      : step.isCompleted
                      ? "text-green-700"
                      : "text-gray-500"
                  }`}
                >
                  {step.label}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    step.isCancelled
                      ? "text-gray-400"
                      : step.isActive
                      ? "text-gray-700"
                      : step.isCompleted
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
