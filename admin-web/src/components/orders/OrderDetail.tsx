"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/useAdminOrders";
import { useMigrateOrder } from "@/hooks/useOrderMigration";
import { AdminOrderDetail, OrderItem, OrderStatus } from "@/lib/admin-orders";
import {
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { generateOrderPDF } from "@/lib/pdf/pdf-generator";
import {
  statusColors,
  statusLabels,
  formatDate,
  formatCurrency,
  getButtonClasses,
  getLoadingState,
  useDebounce,
  LoadingSpinner,
} from "@/components/orders/OrderDetailHelpers";
import Modal from "@/components/common/Modal";
import OrderOverview from "./OrderOverview";
import OrderItems from "./OrderItems";
import OrderTimeline from "./OrderTimeline";
import OrderNotes from "./OrderNotes";

const StatusUpdateIndicator = ({
  isProcessing,
  isPending,
  status,
}: {
  isProcessing: boolean;
  isPending: boolean;
  status: OrderStatus;
}) => {
  if (!isProcessing && !isPending) return null;
  const getStatusMessage = () => {
    if (status === "confirmada") return "Confirmando y sincronizando...";
    if (status === "enviada") return "Marcando como enviada...";
    if (status === "entregada") return "Marcando como entregada...";
    if (status === "cancelada") return "Cancelando pedido...";
    if (status === "reembolsada") return "Procesando reembolso...";
    return "Actualizando estado...";
  };
  return (
    <div className="flex items-center gap-2 text-sm text-blue-600">
      <LoadingSpinner size="sm" />
      <span>{getStatusMessage()}</span>
    </div>
  );
};

function OrderDetail({
  order,
  onRefresh,
  isLoading = false,
}: {
  order: AdminOrderDetail;
  onRefresh?: () => void;
  isLoading?: boolean;
}) {
  const updateStatusMutation = useUpdateOrderStatus();
  const migrateOrderMutation = useMigrateOrder();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "items" | "timeline" | "notes"
  >("overview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<{ status: OrderStatus; label: string } | null>(null);

  const tabs = [
    { id: "overview", label: "Resumen", icon: EyeIcon },
    { id: "items", label: "Productos", icon: ShoppingBagIcon },
    { id: "timeline", label: "Timeline", icon: ClockIcon },
    { id: "notes", label: "Notas", icon: DocumentDuplicateIcon },
  ] as const;

  const orderExtras = order as AdminOrderDetail & { entrega?: unknown };
  type EntregaInfo = { id: string; repartidor_id: string; estado: string };
  const entrega =
    orderExtras.entrega &&
    typeof orderExtras.entrega === "object" &&
    "id" in orderExtras.entrega &&
    "repartidor_id" in orderExtras.entrega &&
    "estado" in orderExtras.entrega
      ? (orderExtras.entrega as EntregaInfo)
      : undefined;

  const orderForConditions = {
    id: order.id,
    estado: order.estado,
    ...(order.tercero_id !== undefined ? { tercero_id: order.tercero_id } : {}),
    ...(order.tns_kardex_id !== undefined
      ? { tns_kardex_id: order.tns_kardex_id }
      : {}),
    ...(order.montado_carro !== undefined
      ? { montado_carro: order.montado_carro }
      : {}),
    ...(entrega ? { entrega } : {}),
  };

  const orderStats = useMemo(() => {
    if (!order) {
      return {
        totalItems: 0,
        totalQuantity: 0,
        averageItemPrice: 0,
        hasDiscount: false,
        hasShipping: false,
        hasTaxes: false,
      };
    }

    const totalItems = order.items?.length || 0;
    const totalQuantity =
      order.items?.reduce((sum, item) => sum + item.cantidad, 0) || 0;
    const averageItemPrice =
      totalQuantity > 0
        ? order.subtotal !== undefined
          ? order.subtotal / totalQuantity
          : 0
        : 0;

    return {
      totalItems,
      totalQuantity,
      averageItemPrice,
      hasDiscount: order.descuento !== undefined && order.descuento > 0,
      hasShipping: order.costoEnvio !== undefined && order.costoEnvio > 0,
      hasTaxes: order.impuestos !== undefined && order.impuestos > 0,
    };
  }, [order]);



  const downloadPDF = async () => {
    try {
      toast.loading("Preparando vista preliminar...", { id: "pdf-loading" });
      const pdfData: any = {
        numero_orden: order.numeroOrden,
        fecha_creacion: order.fechaCreacion,
        estado: order.estado,
        metodo_pago: order.metodoPago,
        items: order.items.map((item: OrderItem) => ({
          producto_nombre: item.productName || "Producto sin nombre",
          cantidad: item.cantidad ?? 0,
          precio_unitario: item.precioUnitario ?? 0,
          subtotal: item.subtotal || 0,
          sku: item.productSku || "",
        })),
        subtotal: order.subtotal || 0,
        descuento: order.descuento || 0,
        costo_envio: order.costoEnvio || 0,
        impuestos: order.impuestos || 0,
        total: order.total,
        notas: order.notas || "",
        direccion_envio: order.direccionEnvio
          ? {
              nombre_completo: order.direccionEnvio.nombreDestinatario,
              telefono: order.direccionEnvio.telefono,
              direccion: order.direccionEnvio.direccion,
              ciudad: order.direccionEnvio.ciudad,
              departamento: order.direccionEnvio.departamento,
              codigo_postal: order.direccionEnvio.codigoPostal || "",
              referencias: order.direccionEnvio.referencias || "",
            }
          : {
              nombre_completo: "",
              telefono: "",
              direccion: "Sin dirección de envío",
              ciudad: "",
              departamento: "",
              codigo_postal: "",
              referencias: "",
            },
        usuario: order.usuario
          ? {
              nombre: order.usuario.nombreCompleto || order.usuario.email,
              email: order.usuario.email,
              telefono: "",
            }
          : {
              nombre: "Cliente",
              email: "",
              telefono: "",
            },
      };
      await generateOrderPDF(pdfData);
      toast.success("✅ Vista preliminar abierta", { id: "pdf-loading" });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("❌ Error al abrir vista preliminar", { id: "pdf-loading" });
    }
  };

  const handleUpdateStatusOptimized = useCallback(async () => {
    if (!selectedStatus || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload: any = { orderId: order.id, newStatus: selectedStatus };
      if (notes) payload.notas = notes;
      const result = await updateStatusMutation.mutateAsync(payload);
      setShowStatusModal(false);
      setSelectedStatus("");
      setNotes("");
      if (result?.data?.terceroSincronizado) {
        const d = result.data as any;
        console.warn("📊 Sincronización exitosa:", {
          terceroId: d.terceroId,
          terceroNombre: d.terceroNombre,
          pedidoId: order.id,
          accion: d.terceroExistia ? "Tercero encontrado en TNS" : "Tercero creado en TNS",
        });
      }
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode !== 503) {
        setShowStatusModal(false);
        setSelectedStatus("");
        setNotes("");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedStatus, notes, order.id, isProcessing, updateStatusMutation]);

  const handleUpdateStatus = useDebounce(handleUpdateStatusOptimized, 300);

  const validateNotes = useCallback((text: string) => {
    setIsValidating(true);
    setTimeout(() => {
      if (text.length > 500) {
        setNotesError("Las notas no pueden exceder 500 caracteres");
      } else if (text.includes("<script>") || text.includes("javascript:")) {
        setNotesError("Las notas contienen contenido no permitido");
      } else {
        setNotesError("");
      }
      setIsValidating(false);
    }, 300);
  }, []);
  const debouncedValidateNotes = useDebounce(validateNotes, 500);

  const handleQuickStatusChangeOptimized = useCallback(
    async (newStatus: OrderStatus) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await updateStatusMutation.mutateAsync({
          orderId: order.id,
          newStatus,
          notas: `Estado cambiado a ${statusLabels[newStatus]}`,
        });
        if (result?.data?.terceroSincronizado) {
          const d = result.data as any;
          console.warn("📊 Información de sincronización:", {
            terceroId: d.terceroId,
            terceroNombre: d.terceroNombre,
            pedidoId: order.id,
            existia: d.terceroExistia ? "Ya existía en TNS" : "Creado nuevo en TNS",
          });
        }
      } catch {} finally {
        setIsProcessing(false);
      }
    },
    [order.id, isProcessing, updateStatusMutation]
  );
  const handleQuickStatusChange = useDebounce(handleQuickStatusChangeOptimized, 200);

  const handleMigrateTercero = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        newStatus: "confirmada",
        notas: "Tercero migrado y pedido confirmado",
        forceSyncTercero: true,
      });
      toast.success("✅ Tercero migrado exitosamente. Pedido confirmado.", {
        duration: 4000,
        position: "top-right",
      });
    } catch {
      toast.error(
        "❌ Error al migrar tercero. Verifique la conexión con ApiTercero.",
        { duration: 5000, position: "top-right" }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [order.id, isProcessing, updateStatusMutation]);

  const handleMigrateToTNS = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await migrateOrderMutation.mutateAsync({
        orderId: order.id,
        options: {
          usuario: order.usuario?.email || "",
          codprefijo: "1",
          codcomp: "PV",
          sucid: 1,
        },
      });
      if (order.estado !== "en_proceso") {
        try {
          await updateStatusMutation.mutateAsync({
            orderId: order.id,
            newStatus: "en_proceso",
            notas: "Pedido migrado a TNS",
          });
        } catch {
          toast.error(
            "⚠️ Pedido migrado, pero no se pudo actualizar el estado a En Proceso.",
            { duration: 5000, position: "top-right" }
          );
        }
      }
      toast.success("✅ Pedido migrado a TNS exitosamente.", {
        duration: 4000,
        position: "top-right",
      });
    } catch {
      toast.error(
        "❌ Error al migrar a TNS. Verifique la conexión con ApiPedidoVenta.",
        { duration: 5000, position: "top-right" }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [order.id, order.estado, order.usuario?.email, isProcessing, migrateOrderMutation, updateStatusMutation]);

  const handleSequentialAction = useCallback(
    async (
      action: "migrate_tercero" | "confirm" | "migrate_tns" | "normal",
      status: OrderStatus
    ) => {
      switch (action) {
        case "migrate_tercero":
          await handleMigrateTercero();
          break;
        case "migrate_tns":
          await handleMigrateToTNS();
          break;
        case "normal":
          await handleQuickStatusChange(status);
          break;
        default:
          break;
      }
    },
    [handleMigrateTercero, handleMigrateToTNS, handleQuickStatusChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const quickActions = getQuickActions(order?.estado || "pendiente");
        switch (event.key) {
          case "1":
            if (quickActions[0]) {
              event.preventDefault();
              handleSequentialAction(
                quickActions[0].action,
                quickActions[0].status
              );
            }
            break;
          case "2":
            if (quickActions[1]) {
              event.preventDefault();
              handleSequentialAction(
                quickActions[1].action,
                quickActions[1].status
              );
            }
            break;
          case "3":
            if (quickActions[2]) {
              event.preventDefault();
              handleSequentialAction(
                quickActions[2].action,
                quickActions[2].status
              );
            }
            break;
        }
      }
      if (event.key === "Escape" && showStatusModal) {
        event.preventDefault();
        setShowStatusModal(false);
        setSelectedStatus("");
        setNotes("");
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        if (
          !showStatusModal &&
          !isProcessing &&
          !updateStatusMutation.isPending
        ) {
          setShowStatusModal(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    order?.estado,
    showStatusModal,
    isProcessing,
    updateStatusMutation.isPending,
    handleSequentialAction,
  ]);

  const confirmCriticalAction = useCallback(async () => {
    if (!pendingAction) return;
    setShowConfirmation(false);
    await handleSequentialAction("normal", pendingAction.status);
    setPendingAction(null);
  }, [pendingAction, handleSequentialAction]);

  const cancelCriticalAction = useCallback(() => {
    setShowConfirmation(false);
    setPendingAction(null);
  }, []);

  const getQuickActions = (
    currentStatus: OrderStatus
  ): {
    status: OrderStatus;
    label: string;
    color: string;
    action: "migrate_tercero" | "confirm" | "migrate_tns" | "normal";
  }[] => {
    const actions: any[] = [];
    switch (currentStatus) {
      case "pendiente":
        actions.push(
          {
            status: "confirmada",
            label: "Confirmar Pedido",
            color: "bg-blue-600 hover:bg-blue-700",
            action: "normal",
          },
          {
            status: "cancelada",
            label: "Cancelar",
            color: "bg-red-600 hover:bg-red-700",
            action: "normal",
          }
        );
        break;
      case "confirmada":
        actions.push(
          {
            status: "confirmada",
            label: "Migrar Tercero",
            color: "bg-orange-600 hover:bg-orange-700",
            action: "migrate_tercero",
          },
          {
            status: "cancelada",
            label: "Cancelar",
            color: "bg-red-600 hover:bg-red-700",
            action: "normal",
          }
        );
        break;
      case "en_proceso":
        actions.push({
          status: "enviada",
          label: "Marcar como Enviada",
          color: "bg-indigo-600 hover:bg-indigo-700",
          action: "normal",
        });
        break;
      case "enviada":
        actions.push({
          status: "entregada",
          label: "Marcar como Entregada",
          color: "bg-green-600 hover:bg-green-700",
          action: "normal",
        });
        break;
      case "cancelada":
        actions.push({
          status: "reembolsada",
          label: "Procesar Reembolso",
          color: "bg-gray-600 hover:bg-gray-700",
          action: "normal",
        });
        break;
      default:
        break;
    }
    return actions;
  };

  const quickActions = getQuickActions(order.estado);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        {/* header with status */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Pedido {order.numeroOrden}
              </h1>
              <span
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 ${
                  statusColors[order.estado]
                } ${
                  isProcessing || updateStatusMutation.isPending
                    ? "animate-pulse"
                    : ""
                }`}
              >
                {statusLabels[order.estado]}
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  title="Actualizar pedido"
                >
                  <ArrowPathIcon 
                    className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              )}
              <StatusUpdateIndicator
                isProcessing={isProcessing}
                isPending={updateStatusMutation.isPending}
                status={(selectedStatus as OrderStatus) || order.estado}
              />
            </div>
            {/* dates grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>Creado: {formatDate(order.fechaCreacion)}</span>
              </div>
              {order.fechaActualizacion && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Actualizado: {formatDate(order.fechaActualizacion)}</span>
                </div>
              )}
              {order.fechaEntregaEstimada && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>
                    Entrega estimada: {formatDate(order.fechaEntregaEstimada, "dd MMM yyyy")}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {orderStats.totalItems}
                </div>
                <div className="text-xs text-gray-600">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {orderStats.totalQuantity}
                </div>
                <div className="text-xs text-gray-600">Cantidad Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${formatCurrency(orderStats.averageItemPrice)}
                </div>
                <div className="text-xs text-gray-600">Precio Promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ${formatCurrency(order.total)}
                </div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {quickActions.map((action, index) => {
                const isLoading = getLoadingState(
                  isProcessing,
                  updateStatusMutation.isPending,
                  migrateOrderMutation.isPending
                );
                return (
                  <button
                    key={action.status}
                    onClick={() => handleSequentialAction(action.action, action.status)}
                    disabled={isLoading}
                    className={`${getButtonClasses("primary")} ${action.color}`}
                    title={`${action.label} (Ctrl+${index + 1})`}
                  >
                    {isLoading && (
                      <LoadingSpinner size="sm" className="text-white" />
                    )}
                    {isLoading
                      ? action.action === "migrate_tercero"
                        ? "Migrando Tercero..."
                        : action.action === "migrate_tns"
                        ? "Migrando a TNS..."
                        : "Procesando..."
                      : action.label}
                    {!isLoading && (
                      <span className="absolute -top-1 -right-1 bg-white text-gray-600 text-xs px-1.5 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Ctrl+{index + 1}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setShowStatusModal(true)}
                disabled={getLoadingState(isProcessing, updateStatusMutation.isPending)}
                className={getButtonClasses("secondary")}
                title="Más Opciones (Ctrl+E)"
              >
                Más Opciones
                <span className="absolute -top-1 -right-1 bg-white text-gray-600 text-xs px-1.5 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Ctrl+E
                </span>
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
                title="Vista preliminar PDF del pedido"
              >
                <EyeIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Vista Preliminar PDF</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {(order.estado === "cancelada" || order.estado === "reembolsada") && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ Este pedido ha sido {order.estado === "cancelada" ? "cancelado" : "reembolsado"}
            </p>
          </div>
        )}
      </div>
      <div className="mt-6">
        {activeTab === "overview" && (
          <OrderOverview order={order} orderForConditions={orderForConditions} />
        )}
        {activeTab === "items" && <OrderItems order={order} />}
        {activeTab === "timeline" && <OrderTimeline order={order} />}
        {activeTab === "notes" && <OrderNotes order={order} />}
      </div>

      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedStatus("");
          setNotes("");
        }}
        title="Cambiar Estado del Pedido"
        subtitle={`Pedido #${order.numeroOrden}`}
        headerGradient="from-blue-600 to-indigo-600"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowStatusModal(false);
                setSelectedStatus("");
                setNotes("");
              }}
              disabled={getLoadingState(isProcessing, updateStatusMutation.isPending)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={
                !selectedStatus ||
                getLoadingState(isProcessing, updateStatusMutation.isPending) ||
                !!notesError ||
                isValidating
              }
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {getLoadingState(isProcessing, updateStatusMutation.isPending) && <LoadingSpinner size="sm" className="text-white" />}
              {getLoadingState(isProcessing, updateStatusMutation.isPending) ? selectedStatus === "confirmada" ? "Confirmando y sincronizando..." : "Actualizando..." : "Actualizar Estado"}
            </button>
          </div>
        }
      >
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado Actual</label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[order.estado]}`}>{statusLabels[order.estado]}</span>
            <ArrowPathIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Cambiar a:</span>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Nuevo Estado</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusLabels).map(([status, label]) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as OrderStatus)}
                disabled={isProcessing || updateStatusMutation.isPending}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                  transform hover:scale-105 active:scale-95
                  ${selectedStatus === status ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"}
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${status === "cancelada" || status === "reembolsada" ? "hover:border-red-300 hover:bg-red-50" : ""}
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedStatus === status ? "bg-blue-500" : statusColors[status as OrderStatus]?.split(" ")[0]?.replace("bg-", "bg-") || "bg-gray-500"}`} />
                  {label}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas Adicionales <span className="text-gray-400 font-normal ml-1">(Opcional)</span></label>
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => { const v = e.target.value; setNotes(v); debouncedValidateNotes(v); }}
              rows={3}
              disabled={isProcessing || updateStatusMutation.isPending}
              className={
                `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${notesError ? "border-red-300 bg-red-50" : notes.length > 0 && !notesError ? "border-green-300 bg-green-50" : "border-gray-300"}`
              }
              placeholder="Describe el motivo del cambio o información adicional..."
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              {isValidating && <LoadingSpinner size="sm" className="text-blue-500" />}
              {!isValidating && notes.length > 0 && !notesError && (
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {!isValidating && notesError && (
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-xs ${notesError ? "text-red-500" : notes.length > 400 ? "text-yellow-500" : "text-gray-400"}`}>{notes.length}/500</span>
            </div>
          </div>
          {notesError && <div className="mt-2 flex items-center gap-2 text-sm text-red-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{notesError}</div>}
          {notes.length > 0 && !notesError && <div className="mt-2 text-xs text-green-600">✓ Las notas se han validado correctamente</div>}
        </div>
        {selectedStatus && <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><ArrowPathIcon className="h-4 w-4 text-blue-600" /></div><div><p className="text-sm font-medium text-blue-900">Cambio de estado programado</p><p className="text-xs text-blue-700">{statusLabels[order.estado]} → {statusLabels[selectedStatus]}</p></div></div></div>}
      </Modal>

      <Modal
        isOpen={showConfirmation && !!pendingAction}
        onClose={cancelCriticalAction}
        title="Confirmar Acción Crítica"
        subtitle="Esta acción no se puede deshacer"
        headerGradient="from-red-600 to-orange-600"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={cancelCriticalAction}
              disabled={getLoadingState(isProcessing, updateStatusMutation.isPending)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >Cancelar</button>
            <button
              onClick={confirmCriticalAction}
              disabled={getLoadingState(isProcessing, updateStatusMutation.isPending)}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {getLoadingState(isProcessing, updateStatusMutation.isPending) && <LoadingSpinner size="sm" className="text-white" />}
              {getLoadingState(isProcessing, updateStatusMutation.isPending) ? "Procesando..." : `Sí, ${pendingAction?.label}`}
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Estás seguro de que quieres {pendingAction?.label.toLowerCase()} este pedido?
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Esta acción cambiará el estado del pedido a <strong>{pendingAction ? statusLabels[pendingAction.status] : ""}</strong></p>
              <p>• El cambio será permanente y no se puede deshacer</p>
              <p>• Se enviará una notificación al cliente</p>
              {pendingAction?.status === "cancelada" && <p className="text-red-600 font-medium">• El pedido será cancelado y se puede requerir reembolso</p>}
              {pendingAction?.status === "reembolsada" && <p className="text-red-600 font-medium">• Se procesará el reembolso del pedido</p>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function OrderDetailWrapper({ orderId }: { orderId: string }) {
  const { data, isLoading, error, refetch } = useAdminOrder(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-red-800">Error al cargar el pedido</p>
        </div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">No encontrado</h2>
          <p className="text-gray-800">El pedido no existe</p>
        </div>
      </div>
    );
  }

  return <OrderDetail order={data.data} onRefresh={refetch} isLoading={isLoading} />;
}
