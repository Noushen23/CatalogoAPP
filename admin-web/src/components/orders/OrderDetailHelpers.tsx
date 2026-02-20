import { useCallback, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { OrderStatus } from "@/lib/admin-orders";

// ===== CONSTANTES =====
export const statusColors: Record<OrderStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-blue-100 text-blue-800",
  en_proceso: "bg-purple-100 text-purple-800",
  enviada: "bg-indigo-100 text-indigo-800",
  entregada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
  reembolsada: "bg-gray-100 text-gray-800",
};

export const statusLabels: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_proceso: "En Proceso",
  enviada: "Enviada",
  entregada: "Entregada",
  cancelada: "Cancelada",
  reembolsada: "Reembolsada",
};

export const paymentMethodLabels: Record<string, string> = {
  wompi: "Wompi",
  tarjeta: "Tarjeta",
  pse: "PSE",
  nequi: "Nequi",
  bancolombia_transfer: "Bancolombia",
};

// ===== UTILIDADES =====
export const formatDate = (
  date: string,
  formatStr: string = "dd MMM yyyy, HH:mm"
) => {
  return format(new Date(date), formatStr, { locale: es });
};

export const formatCurrency = (amount: number) => {
  return amount.toLocaleString("es-CO");
};

export const getButtonClasses = (
  variant: "primary" | "secondary" | "danger" | "success"
) => {
  const baseClasses =
    "px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 group relative transform";

  const variantClasses: Record<
    "primary" | "secondary" | "danger" | "success",
    string
  > = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  return `${baseClasses} ${variantClasses[variant]}`;
};

export const getLoadingState = (
  isProcessing: boolean,
  updatePending: boolean,
  migratePending: boolean = false
) => {
  return isProcessing || updatePending || migratePending;
};

// Hook de debounce reutilizable
export function useDebounce<Args extends unknown[], R>(
  callback: (...args: Args) => R,
  delay: number
): (...args: Args) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
}

// Spinner usado en varios lugares
export const LoadingSpinner = ({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizeClasses: Record<string, string> = {
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
