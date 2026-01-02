"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/useAdminOrders";
import { useMigrateOrder } from "@/hooks/useOrderMigration";
import { useQueryClient } from "@tanstack/react-query";
import { OrderStatus } from "@/lib/admin-orders";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShoppingBagIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import OrderMigrationStatus from "./OrderMigrationStatus";
import OrderProcessConditions from "./OrderProcessConditions";
import toast from "react-hot-toast";
import { generateOrderPDF } from "@/lib/pdf/pdf-generator";

// ===== CONSTANTES REUTILIZABLES =====
const statusColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-blue-100 text-blue-800",
  en_proceso: "bg-purple-100 text-purple-800",
  enviada: "bg-indigo-100 text-indigo-800",
  entregada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
  reembolsada: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_proceso: "En Proceso",
  enviada: "Enviada",
  entregada: "Entregada",
  cancelada: "Cancelada",
  reembolsada: "Reembolsada",
};

const paymentMethodLabels = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  pse: "PSE",
};

// ===== FUNCIONES REUTILIZABLES PARA REDUCIR DUPLICACIÓN =====
// Función para formatear fechas (usada múltiples veces)
const formatDate = (date: string, formatStr: string = "dd MMM yyyy, HH:mm") => {
  return format(new Date(date), formatStr, { locale: es });
};

// Función para formatear moneda (usada múltiples veces)
const formatCurrency = (amount: number) => {
  return amount.toLocaleString("es-CO");
};

// Función para generar clases de botón reutilizables
const getButtonClasses = (
  variant: "primary" | "secondary" | "danger" | "success"
) => {
  const baseClasses =
    "px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 group relative transform";

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  return `${baseClasses} ${variantClasses[variant]}`;
};

// Función para generar clases de estado de carga
const getLoadingState = (
  isProcessing: boolean,
  updatePending: boolean,
  migratePending: boolean = false
) => {
  return isProcessing || updatePending || migratePending;
};

// Hook de debounce corregido
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Necesitamos que useCallback tenga la dependencia correcta siempre
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

const LoadingSpinner = ({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
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
  );
};

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

function OrderDetail({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useAdminOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus();
  const migrateOrderMutation = useMigrateOrder();
  const queryClient = useQueryClient();

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
  const [pendingAction, setPendingAction] = useState<{
    status: OrderStatus;
    label: string;
  } | null>(null);

  const order = data?.data;

  // Solucionar: verificaciones de hooks y derives
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

  // ===== TIMELINE CONFIGURACIÓN REUTILIZABLE =====
  // Función para generar configuración de timeline (reduce duplicación de colores y estilos)
  const getTimelineConfig = () => {
    const baseConfig = {
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
    };
    return baseConfig;
  };

  const orderTimeline = useMemo(() => {
    if (!order) return [];

    const timelineConfig = getTimelineConfig();
    const timeline = [
      {
        status: "pendiente" as OrderStatus,
        label: "Pedido Recibido",
        description:
          "El pedido ha sido recibido y está pendiente de confirmación",
        ...timelineConfig.pendiente,
      },
      {
        status: "confirmada" as OrderStatus,
        label: "Pedido Confirmado",
        description: "El pedido ha sido confirmado y está siendo procesado",
        ...timelineConfig.confirmada,
      },
      {
        status: "en_proceso" as OrderStatus,
        label: "En Proceso",
        description: "El pedido cumple todas las condiciones: tercero en TNS, pedido en TNS, repartidor asignado y montado al carro",
        ...timelineConfig.en_proceso,
      },
      {
        status: "enviada" as OrderStatus,
        label: "Enviada",
        description: "El repartidor ha iniciado la ruta y el pedido está en camino",
        ...timelineConfig.enviada,
      },
      {
        status: "entregada" as OrderStatus,
        label: "Entregado",
        description: "El pedido ha sido entregado exitosamente",
        ...timelineConfig.entregada,
      },
    ];

    const currentIndex = timeline.findIndex(
      (item) => item.status === order.estado
    );

    return timeline.map((item, index) => ({
      ...item,
      isActive: index === currentIndex,
      isCompleted: index < currentIndex,
      isCancelled:
        order.estado === "cancelada" || order.estado === "reembolsada",
    }));
  }, [order]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar el pedido</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">
            No encontrado
          </h2>
          <p className="text-gray-800">El pedido no existe</p>
        </div>
      </div>
    );
  }

  // Función utilidad
  // const copyToClipboard = async (text: string, label: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     toast.success(`${label} copiado al portapapeles`);
  //   } catch (error) {
  //     toast.error("Error al copiar al portapapeles");
  //   }
  // };

  // const printOrder = () => {
  //   window.print();
  //   toast.success("Imprimiendo pedido...");
  // };

  const downloadPDF = async () => {
    try {
      toast.loading("Preparando vista preliminar...", { id: "pdf-loading" });

      // Preparar datos del pedido para el PDF
      const pdfData = {
        numero_orden: order.numeroOrden,
        fecha_creacion: order.fechaCreacion,
        estado: order.estado,
        metodo_pago: order.metodoPago,
        items: order.items.map((item: any) => ({
          producto_nombre: item.productName || "Producto sin nombre",
          cantidad: item.quantity || item.cantidad || 0,
          precio_unitario: item.unitPrice || item.precioUnitario || 0,
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

  // const shareOrder = async () => {
  //   if (navigator.share) {
  //     try {
  //       await navigator.share({
  //         title: `Pedido ${order.numeroOrden}`,
  //         text: `Pedido ${order.numeroOrden} - ${order.usuario?.nombreCompleto}`,
  //         url: window.location.href,
  //       });
  //     } catch (error) {
  //       // no toast
  //     }
  //   } else {
  //     copyToClipboard(window.location.href, "Enlace del pedido");
  //   }
  // };

  // Solucionar: acción para actualizar estado
  const handleUpdateStatusOptimized = useCallback(async () => {
    if (!selectedStatus || isProcessing) return;
    setIsProcessing(true);

    try {
      const payload: {
        orderId: string;
        newStatus: OrderStatus;
        notas?: string;
      } = {
        orderId: order.id,
        newStatus: selectedStatus,
        ...(notes && { notas: notes }),
      };
      const result = await updateStatusMutation.mutateAsync(payload);

      setShowStatusModal(false);
      setSelectedStatus("");
      setNotes("");

      if (result?.data?.terceroSincronizado) {
        const orderData = result.data as any;
        console.log("📊 Sincronización exitosa:", {
          terceroId: orderData.terceroId,
          terceroNombre: orderData.terceroNombre,
          pedidoId: order.id,
          accion: orderData.terceroExistia
            ? "Tercero encontrado en TNS"
            : "Tercero creado en TNS",
        });
      }
    } catch (error: any) {
      // El onError del hook ya maneja el toast.
      const statusCode = error?.response?.status;
      if (statusCode === 503) {
        // Mantener el modal abierto para reintentar.
      } else {
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
          const orderData = result.data as any;
          console.log("📊 Información de sincronización:", {
            terceroId: orderData.terceroId,
            terceroNombre: orderData.terceroNombre,
            pedidoId: order.id,
            existia: orderData.terceroExistia
              ? "Ya existía en TNS"
              : "Creado nuevo en TNS",
          });
        }
      } catch (error: any) {
        // El onError del hook ya maneja el toast
      } finally {
        setIsProcessing(false);
      }
    },
    [order.id, isProcessing, updateStatusMutation]
  );
  const handleQuickStatusChange = useDebounce(
    handleQuickStatusChangeOptimized,
    200
  );

  const handleMigrateTercero = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        newStatus: "confirmada",
        notas: "Tercero migrado y pedido confirmado",
      });
      toast.success("✅ Tercero migrado exitosamente. Pedido confirmado.", {
        duration: 4000,
        position: "top-right",
      });
    } catch (error: any) {
      toast.error(
        "❌ Error al migrar tercero. Verifique la conexión con ApiTercero.",
        {
          duration: 5000,
          position: "top-right",
        }
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
          iniciarPreparacion: true,
          usuario: order.usuario?.email || "",
          codprefijo: "1",
          codcomp: "PV",
          sucid: 1,
        },
      });
      toast.success(
        "✅ Pedido migrado a TNS exitosamente. Preparación iniciada.",
        {
          duration: 4000,
          position: "top-right",
        }
      );
    } catch (error: any) {
      toast.error(
        "❌ Error al migrar a TNS. Verifique la conexión con ApiPedidoVenta.",
        {
          duration: 5000,
          position: "top-right",
        }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [order.id, isProcessing, migrateOrderMutation]);

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

  // ===== FUNCIÓN NO UTILIZADA (COMENTADA) =====
  // Esta función estaba duplicada y no se usa en el código actual
  /*
  const handleCriticalAction = useCallback(
    (status: OrderStatus, label: string) => {
      if (['cancelada', 'reembolsada'].includes(status)) {
        setPendingAction({ status, label });
        setShowConfirmation(true);
      } else {
        handleSequentialAction('normal', status);
      }
    },
    [handleSequentialAction]
  );
  */

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

  // Solucionar: order.estado puede ser undefined si pedido está sin datos.
  const getQuickActions = (
    currentStatus: OrderStatus
  ): {
    status: OrderStatus;
    label: string;
    color: string;
    action: "migrate_tercero" | "confirm" | "migrate_tns" | "normal";
  }[] => {
    const actions: {
      status: OrderStatus;
      label: string;
      color: string;
      action: "migrate_tercero" | "confirm" | "migrate_tns" | "normal";
    }[] = [];
    switch (currentStatus) {
      case "pendiente":
        actions.push(
          {
            status: "pendiente",
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
      case "confirmada":
        actions.push(
          // { status: 'confirmada', label: 'Migrar a TNS', color: 'bg-indigo-600 hover:bg-indigo-700', action: 'migrate_tns' },
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
              {/* <button
                onClick={() =>
                  copyToClipboard(order.numeroOrden, "Número de pedido")
                }
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copiar número de pedido"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button> */}
              <StatusUpdateIndicator
                isProcessing={isProcessing}
                isPending={updateStatusMutation.isPending}
                status={(selectedStatus as OrderStatus) || order.estado}
              />
            </div>

            {/* ===== SECCIÓN DE FECHAS (CÓDIGO DUPLICADO COMENTADO) ===== */}
            {/* 
            CÓDIGO DUPLICADO IDENTIFICADO:
            - Múltiples divs con clases similares: "flex items-center gap-2 text-sm text-gray-600"
            - Formateo de fechas repetido: format(new Date(...), 'dd MMM yyyy, HH:mm', { locale: es })
            - Patrón de iconos + span repetido
            SOLUCIÓN: Usar función formatDate() y componente reutilizable
            */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>Creado: {formatDate(order.fechaCreacion)}</span>
              </div>
              {order.fechaActualizacion && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>
                    Actualizado: {formatDate(order.fechaActualizacion)}
                  </span>
                </div>
              )}
              {order.fechaEntregaEstimada && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>
                    Entrega estimada:{" "}
                    {formatDate(order.fechaEntregaEstimada, "dd MMM yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* ===== ESTADÍSTICAS (CÓDIGO DUPLICADO COMENTADO) ===== */}
            {/* 
            CÓDIGO DUPLICADO IDENTIFICADO:
            - Múltiples divs con estructura idéntica: "text-center" + "text-2xl font-bold" + "text-xs text-gray-600"
            - Formateo de moneda repetido: toLocaleString('es-CO')
            - Colores hardcodeados repetidos: text-blue-600, text-green-600, etc.
            SOLUCIÓN: Usar función formatCurrency() y componente reutilizable
            */}
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
            {/* ===== ACCIONES PRINCIPALES (CÓDIGO DUPLICADO COMENTADO) ===== */}

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
                    onClick={() =>
                      handleSequentialAction(action.action, action.status)
                    }
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
                disabled={getLoadingState(
                  isProcessing,
                  updateStatusMutation.isPending
                )}
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
            {[
              { id: "overview", label: "Resumen", icon: EyeIcon },
              { id: "items", label: "Productos", icon: ShoppingBagIcon },
              { id: "timeline", label: "Timeline", icon: ClockIcon },
              { id: "notes", label: "Notas", icon: DocumentDuplicateIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
              ⚠️ Este pedido ha sido{" "}
              {order.estado === "cancelada" ? "cancelado" : "reembolsado"}
            </p>
          </div>
        )}
      </div>
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Info sincronización */}
            {order.estado === "confirmada" &&
              (order as any).terceroSincronizado && (
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
                        {(order as any).terceroNombre && (
                          <p className="text-sm text-blue-800">
                            <span className="font-semibold">Tercero:</span>{" "}
                            {(order as any).terceroNombre}
                          </p>
                        )}
                        {(order as any).terceroId && (
                          <p className="text-xs text-blue-700">
                            ID del Tercero:{" "}
                            <code className="bg-blue-100 px-2 py-0.5 rounded">
                              {(order as any).terceroId}
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
                  order={{
                    id: order.id,
                    estado: order.estado,
                    tercero_id: (order as any).tercero_id,
                    tns_kardex_id: (order as any).tns_kardex_id,
                    montado_carro: (order as any).montado_carro,
                    entrega: (order as any).entrega,
                  }}
                  onUpdate={() => {
                    // Refrescar datos del pedido
                    queryClient.invalidateQueries({ queryKey: ["admin-order", order.id] });
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Cliente
                  </h2>
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
                  {(order.usuario as any)?.tipoIdentificacion && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">
                        Tipo de Identificación:
                      </span>{" "}
                      {(order.usuario as any).tipoIdentificacion}
                    </p>
                  )}
                  {(order.usuario as any)?.numeroIdentificacion && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">
                        Número de Identificación:
                      </span>{" "}
                      {(order.usuario as any).numeroIdentificacion}
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
                      <span className="font-medium text-gray-700">
                        Destinatario:
                      </span>{" "}
                      {order.direccionEnvio.nombreDestinatario ||
                        "No especificado"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Teléfono:
                      </span>{" "}
                      {order.direccionEnvio.telefono || "No especificado"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Dirección:
                      </span>{" "}
                      {order.direccionEnvio.direccion || "No especificada"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Ciudad:</span>{" "}
                      {order.direccionEnvio.ciudad || "No especificada"},{" "}
                      {order.direccionEnvio.departamento || "No especificado"}
                    </p>
                    {order.direccionEnvio.codigoPostal && (
                      <p>
                        <span className="font-medium text-gray-700">
                          Código Postal:
                        </span>{" "}
                        {order.direccionEnvio.codigoPostal}
                      </p>
                    )}
                    {(order.direccionEnvio as any).pais && (
                      <p>
                        <span className="font-medium text-gray-700">País:</span>{" "}
                        {(order.direccionEnvio as any).pais}
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
                          pedido tiene un ID de dirección asociado (
                          <code>{order.direccionEnvioId}</code>), pero no se
                          encontraron los detalles. Es posible que la dirección
                          haya sido eliminada.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "items" && (
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
                      Cantidad:{" "}
                      <span className="font-medium">{item.cantidad}</span>
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
        )}
        {activeTab === "timeline" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                Timeline del Pedido
              </h2>
            </div>
            <div className="space-y-4">
              {orderTimeline.map((step) => {
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
        )}
        {activeTab === "notes" && (
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
        )}
      </div>



      {/* ===== MODAL DE ESTADO (CÓDIGO DUPLICADO COMENTADO) ===== */}
      {/* 
      CÓDIGO DUPLICADO IDENTIFICADO:
      - Múltiples botones con clases similares: "px-6 py-2.5 ... rounded-lg font-medium"
      - Estados de carga repetidos: isProcessing || updateStatusMutation.isPending
      - LoadingSpinner repetido en botones
      - Estructura de modal similar a otros modales
      - Clases de botón duplicadas: "disabled:opacity-50 disabled:cursor-not-allowed"
      SOLUCIÓN: Usar getButtonClasses() y getLoadingState() para consistencia
      */}
      
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <ArrowPathIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Cambiar Estado del Pedido
                    </h3>
                    <p className="text-blue-100 text-sm">
                      Pedido #{order.numeroOrden}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus("");
                    setNotes("");
                  }}
                  disabled={getLoadingState(
                    isProcessing,
                    updateStatusMutation.isPending
                  )}
                  className="text-white hover:text-blue-200 transition-colors disabled:opacity-50"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Actual
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      statusColors[order.estado]
                    }`}
                  >
                    {statusLabels[order.estado]}
                  </span>
                  <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Cambiar a:</span>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nuevo Estado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status as OrderStatus)}
                      disabled={isProcessing || updateStatusMutation.isPending}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                        transform hover:scale-105 active:scale-95
                        ${
                          selectedStatus === status
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        ${
                          status === "cancelada" || status === "reembolsada"
                            ? "hover:border-red-300 hover:bg-red-50"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            selectedStatus === status
                              ? "bg-blue-500"
                              : statusColors[status as OrderStatus]
                                  ?.split(" ")[0]
                                  ?.replace("bg-", "bg-") || "bg-gray-500"
                          }`}
                        />
                        {label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                  <span className="text-gray-400 font-normal ml-1">
                    (Opcional)
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNotes(value);
                      debouncedValidateNotes(value);
                    }}
                    rows={3}
                    disabled={isProcessing || updateStatusMutation.isPending}
                    className={`
                      w-full px-4 py-3 border rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      resize-none transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        notesError
                          ? "border-red-300 bg-red-50"
                          : notes.length > 0 && !notesError
                          ? "border-green-300 bg-green-50"
                          : "border-gray-300"
                      }
                    `}
                    placeholder="Describe el motivo del cambio o información adicional..."
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    {isValidating && (
                      <LoadingSpinner size="sm" className="text-blue-500" />
                    )}
                    {!isValidating && notes.length > 0 && !notesError && (
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {!isValidating && notesError && (
                      <svg
                        className="h-4 w-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span
                      className={`text-xs ${
                        notesError
                          ? "text-red-500"
                          : notes.length > 400
                          ? "text-yellow-500"
                          : "text-gray-400"
                      }`}
                    >
                      {notes.length}/500
                    </span>
                  </div>
                </div>
                {notesError && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {notesError}
                  </div>
                )}
                {notes.length > 0 && !notesError && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ Las notas se han validado correctamente
                  </div>
                )}
              </div>
              {selectedStatus && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ArrowPathIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Cambio de estado programado
                      </p>
                      <p className="text-xs text-blue-700">
                        {statusLabels[order.estado]} →{" "}
                        {statusLabels[selectedStatus]}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="mb-3 text-xs text-gray-500 flex items-center gap-4">
                <span>💡 Shortcuts:</span>
                <span>Ctrl+E: Abrir modal</span>
                <span>Esc: Cerrar modal</span>
                <span>Ctrl+1-3: Acciones rápidas</span>
              </div>
              {/* ===== BOTONES DEL MODAL (CÓDIGO DUPLICADO COMENTADO) ===== */}
              {/* 
              CÓDIGO DUPLICADO IDENTIFICADO:
              - Botones con clases similares: "px-6 py-2.5 ... rounded-lg font-medium"
              - Estados de carga repetidos: isProcessing || updateStatusMutation.isPending
              - LoadingSpinner repetido
              - Clases disabled duplicadas
              SOLUCIÓN: Usar getButtonClasses() y getLoadingState()
              */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus("");
                    setNotes("");
                  }}
                  disabled={getLoadingState(
                    isProcessing,
                    updateStatusMutation.isPending
                  )}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={
                    !selectedStatus ||
                    getLoadingState(
                      isProcessing,
                      updateStatusMutation.isPending
                    ) ||
                    !!notesError ||
                    isValidating
                  }
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {getLoadingState(
                    isProcessing,
                    updateStatusMutation.isPending
                  ) && <LoadingSpinner size="sm" className="text-white" />}
                  {getLoadingState(isProcessing, updateStatusMutation.isPending)
                    ? selectedStatus === "confirmada"
                      ? "Confirmando y sincronizando..."
                      : "Actualizando..."
                    : "Actualizar Estado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== MODAL DE CONFIRMACIÓN (CÓDIGO DUPLICADO COMENTADO) ===== */}
      {/* 
      CÓDIGO DUPLICADO IDENTIFICADO:
      - Estructura de modal idéntica al modal de estado
      - Mismos estilos de backdrop y animaciones
      - Botones con clases similares
      - Estados de carga repetidos
      SOLUCIÓN: Crear componente Modal reutilizable con props para variantes
      */}
      {showConfirmation && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Confirmar Acción Crítica
                  </h3>
                  <p className="text-red-100 text-sm">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    ¿Estás seguro de que quieres{" "}
                    {pendingAction.label.toLowerCase()} este pedido?
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      • Esta acción cambiará el estado del pedido a{" "}
                      <strong>{statusLabels[pendingAction.status]}</strong>
                    </p>
                    <p>• El cambio será permanente y no se puede deshacer</p>
                    <p>• Se enviará una notificación al cliente</p>
                    {pendingAction.status === "cancelada" && (
                      <p className="text-red-600 font-medium">
                        • El pedido será cancelado y se puede requerir reembolso
                      </p>
                    )}
                    {pendingAction.status === "reembolsada" && (
                      <p className="text-red-600 font-medium">
                        • Se procesará el reembolso del pedido
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* ===== BOTONES DEL MODAL DE CONFIRMACIÓN (CÓDIGO DUPLICADO COMENTADO) ===== */}

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={cancelCriticalAction}
                disabled={getLoadingState(
                  isProcessing,
                  updateStatusMutation.isPending
                )}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCriticalAction}
                disabled={getLoadingState(
                  isProcessing,
                  updateStatusMutation.isPending
                )}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {getLoadingState(
                  isProcessing,
                  updateStatusMutation.isPending
                ) && <LoadingSpinner size="sm" className="text-white" />}
                {getLoadingState(isProcessing, updateStatusMutation.isPending)
                  ? "Procesando..."
                  : `Sí, ${pendingAction.label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailWrapper({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useAdminOrder(orderId);

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
          <h2 className="text-2xl font-bold text-gray-600 mb-4">
            No encontrado
          </h2>
          <p className="text-gray-800">El pedido no existe</p>
        </div>
      </div>
    );
  }

  return <OrderDetail orderId={orderId} />;
}
