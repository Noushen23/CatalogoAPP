'use client';

import { Route, Package, User, MapPin, Calendar, Eye, Play, CheckCircle2, AlertCircle, Edit3, ArrowUp, ArrowDown, Save, X, Loader2 } from 'lucide-react';
import { Ruta, RutaPedido } from '@/lib/rutas';

interface SimpleMutation<TVariables = void> {
  isPending?: boolean;
  mutate?: (variables: TVariables) => void;
}

interface RutaCardProps {
  ruta: Ruta;
  rutaExpandida: string | null;
  toggleExpandirRuta: (rutaId: string) => void;
  handleIniciarRuta: (rutaId: string) => void;
  handleAbrirFinalizar: (ruta: Ruta) => void;
  iniciarRutaMutation: SimpleMutation<string>;
  rutaParaFinalizar: string | null;
  pedidosEntregados: Set<string>;
  pedidosNoEntregados: Set<string>;
  togglePedidoEntregado: (pedidoId: string) => void;
  togglePedidoNoEntregado: (pedidoId: string) => void;
  handleFinalizarRuta: (ruta: Ruta) => void;
  finalizarRutaMutation: SimpleMutation<{ ruta_id: string; pedidos_entregados: string[]; pedidos_no_entregados: string[] }>;
  rutaEditandoOrden: string | null;
  iniciarEdicionOrden: (ruta: Ruta) => void;
  ordenEditado: Array<{ orden_id: string; secuencia: number }>;
  moverPedido: (index: number, direccion: 'arriba' | 'abajo') => void;
  guardarOrden: (ruta: Ruta) => void;
  cancelarEdicion: () => void;
  cancelarFinalizar?: () => void;
  cambiarOrdenMutation: SimpleMutation<{ ruta_id: string; nuevo_orden: Array<{ orden_id: string; secuencia: number }>; motivo?: string }>;
  toggleAlternativaMutation: SimpleMutation<{ ruta_id: string; activar: boolean }>;
  getEstadoColor: (estado: string) => string;
}

export function RutaCard({
  ruta,
  rutaExpandida,
  toggleExpandirRuta,
  handleIniciarRuta,
  handleAbrirFinalizar,
  iniciarRutaMutation,
  rutaParaFinalizar,
  pedidosEntregados,
  pedidosNoEntregados,
  togglePedidoEntregado,
  togglePedidoNoEntregado,
  handleFinalizarRuta,
  finalizarRutaMutation,
  rutaEditandoOrden,
  iniciarEdicionOrden,
  ordenEditado,
  moverPedido,
  guardarOrden,
  cancelarEdicion,
  cancelarFinalizar,
  cambiarOrdenMutation,
  toggleAlternativaMutation,
  getEstadoColor,
}: RutaCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Header de la ruta */}
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => toggleExpandirRuta(ruta.id)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-700 flex-shrink-0">
            <Route className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 truncate">{ruta.nombre}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize flex-shrink-0 ${getEstadoColor(
                  ruta.estado
                )}`}
              >
                {ruta.estado.replace('_', ' ')}
              </span>
            </div>
            {ruta.descripcion && (
              <p className="mt-1 text-sm text-gray-600 truncate">{ruta.descripcion}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{ruta.repartidor_nombre || 'Sin asignar'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                <span>
                  {ruta.pedidos_asignados} / {ruta.capacidad_maxima}
                </span>
              </div>
              {ruta.distancia_total_km && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{ruta.distancia_total_km.toFixed(1)} km</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(ruta.fecha_creacion).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="ml-3 flex items-center gap-2 flex-shrink-0">
          {/* Botones de acción según el estado */}
          {(ruta.estado === 'planificada' || ruta.estado === 'activa') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleIniciarRuta(ruta.id);
              }}
              disabled={iniciarRutaMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-3 w-3" />
              {iniciarRutaMutation.isPending ? '...' : 'Iniciar'}
            </button>
          )}

          {ruta.estado === 'en_curso' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAbrirFinalizar(ruta);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-purple-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Finalizar
            </button>
          )}

          <Eye
            className={`h-4 w-4 text-gray-400 transition flex-shrink-0 ${
              rutaExpandida === ruta.id ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Detalles expandidos */}
      {rutaExpandida === ruta.id && ruta.pedidos && ruta.pedidos.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {/* Información de ruta alternativa */}
          {ruta.ruta_alternativa && (
            <div className={`mb-4 rounded-lg border p-3 ${
              ruta.ruta_alternativa.activa
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${
                  ruta.ruta_alternativa.activa ? 'text-amber-600' : 'text-gray-500'
                }`} />
                <p className={`text-xs font-medium ${
                  ruta.ruta_alternativa.activa ? 'text-amber-900' : 'text-gray-700'
                }`}>
                  {ruta.ruta_alternativa.activa
                    ? '⚠️ Ruta alternativa ACTIVA'
                    : 'ℹ️ Ruta alternativa disponible pero INACTIVA'}
                </p>
              </div>
              {ruta.ruta_alternativa.motivo && (
                <p className="mt-1 text-xs text-gray-600 pl-6">
                  Motivo: {ruta.ruta_alternativa.motivo}
                </p>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAlternativaMutation.mutate?.({
                      ruta_id: ruta.id,
                      activar: !ruta.ruta_alternativa?.activa,
                    });
                  }}
                  disabled={Boolean(toggleAlternativaMutation.isPending)}
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

          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Pedidos {ruta.ruta_alternativa?.activa ? '(Orden Modificado)' : '(Orden Principal)'}
            </h4>
            <div className="flex items-center gap-2">
              {rutaParaFinalizar === ruta.id && ruta.estado === 'en_curso' && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium text-green-700">{pedidosEntregados.size} ✓</span>
                  <span className="font-medium text-red-700">{pedidosNoEntregados.size} ✗</span>
                  <span className="font-medium text-gray-700">
                    {ruta.pedidos.length - pedidosEntregados.size - pedidosNoEntregados.size} pendientes
                  </span>
                </div>
              )}
              {(ruta.estado === 'planificada' || ruta.estado === 'activa' || ruta.estado === 'en_curso') && 
               ruta.pedidos && 
               ruta.pedidos.length > 0 && 
               rutaEditandoOrden !== ruta.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    iniciarEdicionOrden(ruta);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Edit3 className="h-3 w-3" />
                  Modificar Orden
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(() => {
              if (rutaEditandoOrden === ruta.id && ordenEditado.length > 0) {
                const ordenEditadoOrdenado = [...ordenEditado].sort((a, b) => a.secuencia - b.secuencia);
                return ordenEditadoOrdenado
                  .map((item) => {
                    const pedido = ruta.pedidos?.find((p: RutaPedido) => p.orden_id === item.orden_id);
                    return pedido ? { ...pedido, orden_secuencia: item.secuencia } : null;
                  })
                  .filter((p: RutaPedido | null): p is RutaPedido => p !== null);
              }

              let pedidosOrdenados = [...(ruta.pedidos || [])];
              
              if (ruta.ruta_alternativa?.activa && ruta.ruta_alternativa.orden_secuencia_modificada) {
                const ordenModificado = ruta.ruta_alternativa.orden_secuencia_modificada;
                pedidosOrdenados = ordenModificado
                  .map((item: { orden_id: string; secuencia: number }) => {
                    const pedido = ruta.pedidos?.find((p: RutaPedido) => p.orden_id === item.orden_id);
                    return pedido ? { ...pedido, orden_secuencia: item.secuencia } : null;
                  })
                  .filter((p: RutaPedido | null): p is RutaPedido => p !== null)
                  .sort((a: RutaPedido, b: RutaPedido) => a.orden_secuencia - b.orden_secuencia);
              } else {
                pedidosOrdenados = pedidosOrdenados.sort((a: RutaPedido, b: RutaPedido) => a.orden_secuencia - b.orden_secuencia);
              }
              
              return pedidosOrdenados;
            })().map((pedido: RutaPedido, index: number) => (
              <div
                key={pedido.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  pedido.estado === 'entregado'
                    ? 'border-green-200 bg-green-50'
                    : pedido.estado === 'no_entregado'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 font-bold text-xs text-purple-700 flex-shrink-0">
                  {pedido.orden_secuencia}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">#{pedido.numero_orden}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-600">{pedido.orden_estado}</span>
                  </div>
                  {pedido.direccion && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{pedido.direccion}</span>
                    </div>
                  )}
                  {pedido.total && (
                    <div className="mt-1 text-xs font-medium text-gray-900">
                      ${pedido.total.toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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

                  {rutaEditandoOrden === ruta.id && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          moverPedido(index, 'arriba');
                        }}
                        disabled={index === 0}
                        className="rounded px-1.5 py-1 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        title="Mover arriba"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          moverPedido(index, 'abajo');
                        }}
                        disabled={index >= ordenEditado.length - 1}
                        className="rounded px-1.5 py-1 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        title="Mover abajo"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {rutaParaFinalizar === ruta.id && ruta.estado === 'en_curso' && rutaEditandoOrden !== ruta.id && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => togglePedidoEntregado(pedido.orden_id)}
                        className={`rounded px-2 py-1 text-xs font-medium transition ${
                          pedidosEntregados.has(pedido.orden_id)
                            ? 'bg-green-600 text-white'
                            : 'border border-green-300 bg-white text-green-700 hover:bg-green-50'
                        }`}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => togglePedidoNoEntregado(pedido.orden_id)}
                        className={`rounded px-2 py-1 text-xs font-medium transition ${
                          pedidosNoEntregados.has(pedido.orden_id)
                            ? 'bg-red-600 text-white'
                            : 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                        }`}
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botones para guardar/cancelar edición de orden */}
          {rutaEditandoOrden === ruta.id && (
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                onClick={cancelarEdicion}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="mr-2 inline h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={() => guardarOrden(ruta)}
                disabled={cambiarOrdenMutation.isPending}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {cambiarOrdenMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Botones para confirmar finalización */}
          {rutaParaFinalizar === ruta.id && ruta.estado === 'en_curso' && (
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (cancelarFinalizar) {
                    cancelarFinalizar();
                  }
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleFinalizarRuta(ruta)}
                disabled={finalizarRutaMutation.isPending}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {finalizarRutaMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar Ruta
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

