'use client';

import { useState, useMemo } from 'react';
import {
  Route,
  Play,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  AlertCircle,
  Edit3,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import {
  useMiRuta,
  useCambiarOrdenRuta,
  useToggleRutaAlternativa,
  useIniciarRuta,
  useFinalizarRuta,
} from '@/hooks/useRutas';
import { RutaPedido } from '@/lib/rutas';
import toast from 'react-hot-toast';

export function GestionarRutaRepartidor() {
  const { data: ruta, isLoading, refetch } = useMiRuta();
  const cambiarOrdenMutation = useCambiarOrdenRuta();
  const toggleAlternativaMutation = useToggleRutaAlternativa();
  const iniciarRutaMutation = useIniciarRuta();
  const finalizarRutaMutation = useFinalizarRuta();

  const [editandoOrden, setEditandoOrden] = useState(false);
  const [ordenEditado, setOrdenEditado] = useState<Array<{ orden_id: string; secuencia: number }>>([]);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
  const [pedidosEntregados, setPedidosEntregados] = useState<Set<string>>(new Set());
  const [pedidosNoEntregados, setPedidosNoEntregados] = useState<Set<string>>(new Set());

  const pedidosOrdenados = useMemo(() => {
    if (!ruta?.pedidos) return [];

    // Si hay ruta alternativa activa, usar ese orden
    if (ruta.ruta_alternativa?.activa && ruta.ruta_alternativa.orden_secuencia_modificada) {
      const ordenModificado = ruta.ruta_alternativa.orden_secuencia_modificada;
      return ordenModificado
        .map((item) => {
          const pedido = ruta.pedidos?.find((p) => p.orden_id === item.orden_id);
          return pedido ? { ...pedido, orden_secuencia: item.secuencia } : null;
        })
        .filter((p): p is RutaPedido => p !== null)
        .sort((a, b) => a.orden_secuencia - b.orden_secuencia);
    }

    // Usar orden principal
    return [...(ruta.pedidos || [])].sort((a, b) => a.orden_secuencia - b.orden_secuencia);
  }, [ruta]);


  const iniciarEdicionOrden = () => {
    if (!ruta?.pedidos) return;

    const orden = pedidosOrdenados
      .map((p) => ({
        orden_id: p.orden_id,
        secuencia: p.orden_secuencia,
      }))
      .filter((item): item is { orden_id: string; secuencia: number } => 
        item !== undefined && item.orden_id !== undefined && typeof item.secuencia === 'number'
      );
    setOrdenEditado(orden);
    setEditandoOrden(true);
  };

  const moverPedido = (index: number, direccion: 'arriba' | 'abajo') => {
    const nuevoOrden = [...ordenEditado];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;

    if (nuevoIndex < 0 || nuevoIndex >= nuevoOrden.length) return;

    const temp = nuevoOrden[index];
    if (temp && nuevoOrden[nuevoIndex]) {
      nuevoOrden[index] = nuevoOrden[nuevoIndex];
      nuevoOrden[nuevoIndex] = temp;
    }

    // Actualizar secuencias
    nuevoOrden.forEach((item, idx) => {
      item.secuencia = idx + 1;
    });

    setOrdenEditado(nuevoOrden);
  };

  const guardarOrden = async () => {
    if (!ruta) return;

    try {
      await cambiarOrdenMutation.mutateAsync({
        ruta_id: ruta.id,
        nuevo_orden: ordenEditado,
        motivo: 'Reordenamiento manual por repartidor',
      });
      setEditandoOrden(false);
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const cancelarEdicion = () => {
    setEditandoOrden(false);
    setOrdenEditado([]);
  };

  const handleIniciarRuta = async () => {
    if (!ruta) return;

    if (!confirm('¿Estás seguro de iniciar esta ruta? Esto marcará todos los pedidos como "en camino".')) {
      return;
    }

    try {
      await iniciarRutaMutation.mutateAsync(ruta.id);
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const togglePedidoEntregado = (pedidoId: string) => {
    setPedidosEntregados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(pedidoId)) {
        nuevo.delete(pedidoId);
      } else {
        nuevo.add(pedidoId);
        setPedidosNoEntregados((prevNo) => {
          const nuevoNo = new Set(prevNo);
          nuevoNo.delete(pedidoId);
          return nuevoNo;
        });
      }
      return nuevo;
    });
  };

  const togglePedidoNoEntregado = (pedidoId: string) => {
    setPedidosNoEntregados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(pedidoId)) {
        nuevo.delete(pedidoId);
      } else {
        nuevo.add(pedidoId);
        setPedidosEntregados((prevEnt) => {
          const nuevoEnt = new Set(prevEnt);
          nuevoEnt.delete(pedidoId);
          return nuevoEnt;
        });
      }
      return nuevo;
    });
  };

  const handleFinalizarRuta = async () => {
    if (!ruta) return;

    const totalSeleccionados = pedidosEntregados.size + pedidosNoEntregados.size;
    const totalPedidos = pedidosOrdenados.length;

    if (totalSeleccionados !== totalPedidos) {
      toast.error(`Debes marcar todos los pedidos como entregados o no entregados (${totalSeleccionados}/${totalPedidos})`);
      return;
    }

    if (pedidosEntregados.size === 0 && pedidosNoEntregados.size === 0) {
      toast.error('Debes marcar al menos un pedido como entregado o no entregado');
      return;
    }

    if (!confirm('¿Estás seguro de finalizar esta ruta? Los pedidos no entregados serán liberados para reasignación.')) {
      return;
    }

    try {
      await finalizarRutaMutation.mutateAsync({
        ruta_id: ruta.id,
        pedidos_entregados: Array.from(pedidosEntregados),
        pedidos_no_entregados: Array.from(pedidosNoEntregados),
      });
      setMostrarFinalizar(false);
      setPedidosEntregados(new Set());
      setPedidosNoEntregados(new Set());
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <Route className="h-16 w-16 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No tienes una ruta asignada</h3>
        <p className="mt-2 text-sm text-gray-600">
          Contacta con un administrador para que te asigne una ruta de entrega.
        </p>
      </div>
    );
  }

  const puedeIniciar = ruta.estado === 'planificada' || ruta.estado === 'activa';
  const puedeModificar = 
    (ruta.estado === 'planificada' || ruta.estado === 'activa' || ruta.estado === 'en_curso') &&
    ruta.pedidos &&
    ruta.pedidos.length > 0;
  const puedeFinalizar = ruta.estado === 'en_curso';
  
  // Debug: verificar condiciones
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔍 Estado de la ruta:', ruta.estado);
    console.warn('🔍 Puede modificar:', puedeModificar);
    console.warn('🔍 Editando orden:', editandoOrden);
    console.warn('🔍 Pedidos en ruta:', ruta.pedidos?.length || 0);
  }

  return (
    <div className="space-y-6">
      {/* Header de la ruta */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                <Route className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{ruta.nombre}</h2>
                {ruta.descripcion && <p className="mt-1 text-sm text-gray-600">{ruta.descripcion}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Estado</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">{ruta.estado.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Pedidos</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {ruta.pedidos_asignados} / {ruta.capacidad_maxima}
                </p>
              </div>
              {ruta.distancia_total_km && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Distancia</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{ruta.distancia_total_km.toFixed(1)} km</p>
                </div>
              )}
              {ruta.tiempo_estimado_minutos && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Tiempo Estimado</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{ruta.tiempo_estimado_minutos} min</p>
                </div>
              )}
            </div>

            {ruta.ruta_alternativa && (
              <div className={`mt-4 rounded-lg border p-3 ${
                ruta.ruta_alternativa.activa
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${
                      ruta.ruta_alternativa.activa ? 'text-amber-600' : 'text-gray-500'
                    }`} />
                    <p className={`text-xs font-medium ${
                      ruta.ruta_alternativa.activa ? 'text-amber-900' : 'text-gray-700'
                    }`}>
                      {ruta.ruta_alternativa.activa
                        ? 'Ruta alternativa ACTIVA. Se muestra el orden modificado.'
                        : 'Ruta alternativa disponible pero INACTIVA. Se muestra la ruta principal.'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ruta.ruta_alternativa) {
                        toggleAlternativaMutation.mutate({
                          ruta_id: ruta.id,
                          activar: !ruta.ruta_alternativa.activa,
                        });
                      }
                    }}
                    disabled={toggleAlternativaMutation.isPending}
                    className={`rounded px-2 py-1 text-xs font-medium transition ${
                      ruta.ruta_alternativa.activa
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    } disabled:opacity-50`}
                  >
                    {toggleAlternativaMutation.isPending
                      ? '...'
                      : ruta.ruta_alternativa.activa
                      ? 'Desactivar'
                      : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {puedeIniciar && (
              <button
                onClick={handleIniciarRuta}
                disabled={iniciarRutaMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {iniciarRutaMutation.isPending ? 'Iniciando...' : 'Iniciar Ruta'}
              </button>
            )}

            {puedeModificar && !editandoOrden && (
              <button
                onClick={iniciarEdicionOrden}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4" />
                Modificar Orden
              </button>
            )}

            {/* Mensaje de ayuda si no se puede modificar */}
            {!puedeModificar && ruta.pedidos && ruta.pedidos.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  {ruta.estado === 'completada'
                    ? 'Esta ruta ya está completada. No se puede modificar el orden.'
                    : ruta.estado === 'cancelada'
                    ? 'Esta ruta está cancelada. No se puede modificar el orden.'
                    : 'No se puede modificar el orden en este momento.'}
                </p>
              </div>
            )}

            {puedeFinalizar && (
              <button
                onClick={() => setMostrarFinalizar(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalizar Ruta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos de la Ruta</h3>
          {ruta.ruta_alternativa?.activa && (
            <p className="mt-1 text-xs text-gray-600">Orden modificado (ruta alternativa activa)</p>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          {(editandoOrden ? ordenEditado.map((item) => {
            const pedido = ruta.pedidos?.find((p) => p.orden_id === item.orden_id);
            return pedido ? { ...pedido, orden_secuencia: item.secuencia } : null;
          }).filter((p): p is RutaPedido => p !== null) : pedidosOrdenados).map((pedido, index) => (
            <div
              key={pedido.id}
              className={`p-6 transition ${
                pedido.estado === 'entregado'
                  ? 'bg-green-50'
                  : pedido.estado === 'no_entregado'
                  ? 'bg-red-50'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      pedido.estado === 'entregado'
                        ? 'bg-green-100 text-green-700'
                        : pedido.estado === 'no_entregado'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {pedido.orden_secuencia}
                  </div>
                  {editandoOrden && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moverPedido(index, 'arriba')}
                        disabled={index === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moverPedido(index, 'abajo')}
                        disabled={index === ordenEditado.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">#{pedido.numero_orden}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-600">{pedido.orden_estado}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{pedido.direccion || 'Dirección no disponible'}</span>
                  </div>
                  {pedido.total && (
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      ${pedido.total.toLocaleString('es-CO')}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        pedido.estado === 'entregado'
                          ? 'bg-green-100 text-green-800'
                          : pedido.estado === 'no_entregado'
                          ? 'bg-red-100 text-red-800'
                          : pedido.estado === 'en_camino'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {pedido.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {mostrarFinalizar && puedeFinalizar && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => togglePedidoEntregado(pedido.orden_id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        pedidosEntregados.has(pedido.orden_id)
                          ? 'bg-green-600 text-white'
                          : 'border border-green-300 bg-white text-green-700 hover:bg-green-50'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                      Entregado
                    </button>
                    <button
                      onClick={() => togglePedidoNoEntregado(pedido.orden_id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        pedidosNoEntregados.has(pedido.orden_id)
                          ? 'bg-red-600 text-white'
                          : 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5 inline mr-1" />
                      No Entregado
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {editandoOrden && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelarEdicion}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={guardarOrden}
                disabled={cambiarOrdenMutation.isPending}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {cambiarOrdenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 inline mr-2" />
                )}
                Guardar Orden
              </button>
            </div>
          </div>
        )}

        {mostrarFinalizar && puedeFinalizar && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-700">{pedidosEntregados.size} entregados</span>
                {' • '}
                <span className="font-medium text-red-700">{pedidosNoEntregados.size} no entregados</span>
                {' • '}
                <span className="font-medium text-gray-700">
                  {pedidosOrdenados.length - pedidosEntregados.size - pedidosNoEntregados.size} pendientes
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMostrarFinalizar(false);
                    setPedidosEntregados(new Set());
                    setPedidosNoEntregados(new Set());
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizarRuta}
                  disabled={finalizarRutaMutation.isPending}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {finalizarRutaMutation.isPending ? (
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                  )}
                  Finalizar Ruta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

