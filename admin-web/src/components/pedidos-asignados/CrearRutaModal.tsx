'use client';

import { useState, useMemo } from 'react';
import { X, Route, User, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PedidoAsignadoAdmin } from '@/lib/delivery';
import { useCrearRuta } from '@/hooks/useRutas';
import { useRepartidoresDisponibles } from '@/hooks/useDelivery';
import toast from 'react-hot-toast';

interface CrearRutaModalProps {
  pedidos: PedidoAsignadoAdmin[];
  onCerrar: () => void;
  onRutaCreada?: () => void;
}

export function CrearRutaModal({ pedidos, onCerrar, onRutaCreada }: CrearRutaModalProps) {
  const [repartidorId, setRepartidorId] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [capacidadMaxima, setCapacidadMaxima] = useState(10);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<Set<string>>(new Set());

  const { data: repartidores = [] } = useRepartidoresDisponibles();
  const crearRutaMutation = useCrearRuta();

  const pedidosDisponibles = useMemo(() => {
    // Filtrar pedidos disponibles:
    // 1. Deben estar en estados válidos
    // 2. NO deben estar asignados a una ruta activa (planificada, activa, en_curso)
    // 3. Los pedidos sin ruta_id (null o undefined) están disponibles
    const pedidosFiltrados = pedidos.filter(
      (pedido) => {
        // Verificar estado del pedido
        // Aceptar pedidos en: pendiente, confirmada, en_proceso, enviada
        const estadoValido = 
          pedido.orden_estado === 'pendiente' ||
          pedido.orden_estado === 'confirmada' ||
          pedido.orden_estado === 'en_proceso' ||
          pedido.orden_estado === 'enviada';
        
        if (!estadoValido) return false;
        
        // Si no tiene ruta_id, está disponible
        if (!pedido.ruta_id || pedido.ruta_id === null) {
          return true;
        }
        
        // Si tiene ruta_id, verificar que NO esté en una ruta activa
        // Solo excluir si está en ruta activa (planificada, activa, en_curso)
        const tieneRutaActiva = 
          pedido.ruta_estado === 'planificada' || 
          pedido.ruta_estado === 'activa' || 
          pedido.ruta_estado === 'en_curso';
        
        // Si tiene ruta pero está completada o cancelada, está disponible
        // Si tiene ruta activa, NO está disponible
        return !tieneRutaActiva;
      }
    );
    
    // Eliminar duplicados usando un Map con entrega_id como clave (o id como fallback)
    const pedidosUnicos = new Map();
    pedidosFiltrados.forEach((pedido) => {
      const claveUnica = pedido.entrega_id || pedido.id;
      if (!pedidosUnicos.has(claveUnica)) {
        pedidosUnicos.set(claveUnica, pedido);
      }
    });
    
    return Array.from(pedidosUnicos.values());
  }, [pedidos]);

  const toggleSeleccionPedido = (pedidoId: string) => {
    setPedidosSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(pedidoId)) {
        nuevo.delete(pedidoId);
      } else {
        if (nuevo.size >= capacidadMaxima) {
          toast.error(`Solo puedes seleccionar hasta ${capacidadMaxima} pedidos`);
          return prev;
        }
        nuevo.add(pedidoId);
      }
      return nuevo;
    });
  };

  const seleccionarTodos = () => {
    const maxSeleccion = Math.min(capacidadMaxima, pedidosDisponibles.length);
    if (pedidosSeleccionados.size === maxSeleccion) {
      setPedidosSeleccionados(new Set());
    } else {
      setPedidosSeleccionados(new Set(pedidosDisponibles.slice(0, maxSeleccion).map((p) => p.id)));
    }
  };

  const handleCrearRuta = async () => {
    if (!repartidorId) {
      toast.error('Selecciona un repartidor');
      return;
    }

    if (!nombre.trim()) {
      toast.error('El nombre de la ruta es requerido');
      return;
    }

    if (pedidosSeleccionados.size === 0) {
      toast.error('Selecciona al menos un pedido');
      return;
    }

    if (pedidosSeleccionados.size > capacidadMaxima) {
      toast.error(`La cantidad de pedidos seleccionados excede la capacidad máxima (${capacidadMaxima})`);
      return;
    }

    try {
      await crearRutaMutation.mutateAsync({
        repartidor_id: repartidorId,
        nombre: nombre.trim(),
        ...(descripcion.trim() && { descripcion: descripcion.trim() }),
        capacidad_maxima: capacidadMaxima,
        pedidos_ids: Array.from(pedidosSeleccionados),
      });

      onRutaCreada?.();
      onCerrar();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const repartidorSeleccionado = repartidores.find((r) => r.id === repartidorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Crear Nueva Ruta</h2>
              <p className="text-sm text-gray-600">Asigna pedidos a un repartidor con capacidad limitada</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información de la ruta */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repartidor <span className="text-red-500">*</span>
              </label>
              <select
                value={repartidorId}
                onChange={(e) => setRepartidorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="">Selecciona un repartidor</option>
                {repartidores.map((repartidor) => (
                  <option key={repartidor.id} value={repartidor.id}>
                    {repartidor.nombre_completo} ({repartidor.entregas_en_curso} entregas en curso)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Ruta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Ruta Zona Norte - Mañana"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacidadMaxima}
                  onChange={(e) => {
                    const valor = parseInt(e.target.value) || 10;
                    setCapacidadMaxima(Math.max(1, Math.min(50, valor)));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Notas adicionales sobre la ruta..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>

          {/* Selección de pedidos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Pedidos</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {pedidosSeleccionados.size} / {capacidadMaxima} seleccionados
                </span>
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  className="text-sm font-medium text-purple-700 hover:text-purple-800 hover:underline"
                >
                  {pedidosSeleccionados.size === Math.min(capacidadMaxima, pedidosDisponibles.length)
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </button>
              </div>
            </div>

            {pedidosDisponibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-gray-200 bg-gray-50">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <p className="mt-4 text-sm font-medium text-gray-900">No hay pedidos disponibles</p>
                <p className="mt-2 text-xs text-gray-600">
                  Los pedidos deben estar en estado &quot;pendiente&quot;, &quot;confirmada&quot;, &quot;en_proceso&quot; o &quot;enviada&quot;
                </p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {pedidosDisponibles.map((pedido, index) => {
                  const seleccionado = pedidosSeleccionados.has(pedido.id);
                  const deshabilitado = !seleccionado && pedidosSeleccionados.size >= capacidadMaxima;
                  // Usar entrega_id como clave única, o una combinación de id e index como fallback
                  const claveUnica = pedido.entrega_id || `${pedido.id}-${index}`;

                  return (
                    <label
                      key={claveUnica}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        seleccionado
                          ? 'border-purple-300 bg-purple-50'
                          : deshabilitado
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        disabled={deshabilitado}
                        onChange={() => toggleSeleccionPedido(pedido.id)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">#{pedido.numero_orden}</span>
                          <span className="text-xs text-gray-500">{pedido.usuario_nombre}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">{pedido.direccion}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">
                            ${pedido.total.toLocaleString('es-CO')}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{pedido.orden_estado}</span>
                        </div>
                      </div>
                      {seleccionado && (
                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen */}
          {repartidorSeleccionado && pedidosSeleccionados.size > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Resumen de la Ruta</h4>
              <div className="space-y-1 text-sm text-purple-800">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    <strong>Repartidor:</strong> {repartidorSeleccionado.nombre_completo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>
                    <strong>Pedidos:</strong> {pedidosSeleccionados.size} de {capacidadMaxima}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCrearRuta}
              disabled={crearRutaMutation.isPending || !repartidorId || !nombre.trim() || pedidosSeleccionados.size === 0}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {crearRutaMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creando ruta...
                </span>
              ) : (
                'Crear Ruta'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

