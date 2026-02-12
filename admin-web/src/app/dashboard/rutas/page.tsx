'use client';

import { useState, useMemo } from 'react';
import { Route, Package,  Filter, RefreshCw, Loader2, Search, Grid3x3, List, ChevronDown, ChevronUp } from 'lucide-react';
import { useRutas, useIniciarRuta, useFinalizarRuta, useCambiarOrdenRuta, useToggleRutaAlternativa } from '@/hooks/useRutas';
import { Ruta, RutaPedido } from '@/lib/rutas';
import { RutaCard } from '@/components/rutas/RutaCard';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RutasPage() {
  const [filtros, setFiltros] = useState<{
    repartidor_id?: string;
    estado?: string;
  }>({});
  const [rutaExpandida, setRutaExpandida] = useState<string | null>(null);
  const [rutaParaFinalizar, setRutaParaFinalizar] = useState<string | null>(null);
  const [pedidosEntregados, setPedidosEntregados] = useState<Set<string>>(new Set());
  const [pedidosNoEntregados, setPedidosNoEntregados] = useState<Set<string>>(new Set());
  const [rutaEditandoOrden, setRutaEditandoOrden] = useState<string | null>(null);
  const [ordenEditado, setOrdenEditado] = useState<Array<{ orden_id: string; secuencia: number }>>([]);
  const [vistaAgrupada, setVistaAgrupada] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const iniciarRutaMutation = useIniciarRuta();
  const finalizarRutaMutation = useFinalizarRuta();
  const cambiarOrdenMutation = useCambiarOrdenRuta();
  const toggleAlternativaMutation = useToggleRutaAlternativa();

  const { data, isLoading, refetch, error } = useRutas({
    ...filtros,
    limit: 100,
  });

  type RutaWithExtras = Ruta & { numero_orden?: string };

  // Asegurar que rutas sea siempre un array
  const rutas = useMemo<RutaWithExtras[]>(() => {
    if (Array.isArray((data as { rutas?: RutaWithExtras[] } | undefined)?.rutas)) {
      return (data as { rutas?: RutaWithExtras[] }).rutas || [];
    }
    return Array.isArray(data) ? (data as RutaWithExtras[]) : [];
  }, [data]);
  const total = data?.total || (Array.isArray(data) ? data.length : 0);

  // Filtrar rutas por búsqueda
  const rutasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return rutas;
    const busquedaLower = busqueda.toLowerCase();
    return rutas.filter((ruta) =>
      (ruta.nombre?.toLowerCase() ?? '').includes(busquedaLower) ||
      (ruta.repartidor_nombre?.toLowerCase() ?? '').includes(busquedaLower) ||
      (ruta.descripcion?.toLowerCase() ?? '').includes(busquedaLower) ||
      (ruta.numero_orden?.toLowerCase() ?? '').includes(busquedaLower)
    );
  }, [rutas, busqueda]);

  // Agrupar rutas por estado
  const rutasAgrupadas = useMemo(() => {
    if (!vistaAgrupada) return { todas: rutasFiltradas };

    const grupos: Record<string, RutaWithExtras[]> = {
      en_curso: [],
      activa: [],
      planificada: [],
      completada: [],
      cancelada: [],
      otras: [],
    };

    rutasFiltradas.forEach((ruta) => {
      if (typeof ruta.estado === 'string' && grupos.hasOwnProperty(ruta.estado)) {
        grupos[ruta.estado]?.push(ruta);
      } else {
        grupos.otras?.push(ruta);
      }
    });

    return grupos;
  }, [rutasFiltradas, vistaAgrupada]);

  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({
    en_curso: true,
    activa: true,
    planificada: true,
    completada: false,
    cancelada: false,
    otras: false,
  });

  const toggleExpandirRuta = (rutaId: string) => {
    setRutaExpandida(rutaId === rutaExpandida ? null : rutaId);
  };

  const handleIniciarRuta = async (rutaId: string) => {
    if (!confirm('¿Estás seguro de iniciar esta ruta? Esto marcará todos los pedidos como "en camino".')) {
      return;
    }

    try {
      await iniciarRutaMutation.mutateAsync(rutaId);
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const handleAbrirFinalizar = (ruta: RutaWithExtras) => {
    setRutaParaFinalizar(ruta.id);
    setPedidosEntregados(new Set());
    setPedidosNoEntregados(new Set());
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

  const handleFinalizarRuta = async (ruta: RutaWithExtras) => {
    if (!rutaParaFinalizar) return;

    const totalSeleccionados = pedidosEntregados.size + pedidosNoEntregados.size;
    const totalPedidos = ruta.pedidos?.length || 0;

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
        ruta_id: rutaParaFinalizar,
        pedidos_entregados: Array.from(pedidosEntregados),
        pedidos_no_entregados: Array.from(pedidosNoEntregados),
      });
      setRutaParaFinalizar(null);
      setPedidosEntregados(new Set());
      setPedidosNoEntregados(new Set());
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const iniciarEdicionOrden = (ruta: RutaWithExtras) => {
    if (!ruta?.pedidos) return;

    // Obtener pedidos ordenados según ruta alternativa activa o principal
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
      pedidosOrdenados = pedidosOrdenados.sort(
        (a: RutaPedido, b: RutaPedido) => a.orden_secuencia - b.orden_secuencia
      );
    }

    const orden = pedidosOrdenados
      .map((p) => ({
        orden_id: p.orden_id,
        secuencia: p.orden_secuencia,
      }))
      .filter(
        (item): item is { orden_id: string; secuencia: number } =>
          item !== undefined && item.orden_id !== undefined && typeof item.secuencia === 'number'
      );

    setOrdenEditado(orden);
    setRutaEditandoOrden(ruta.id);
  };

  const moverPedido = (index: number, direccion: 'arriba' | 'abajo') => {
    if (ordenEditado.length === 0) {
      return;
    }

    const nuevoOrden = [...ordenEditado];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;

    if (nuevoIndex < 0 || nuevoIndex >= nuevoOrden.length) {
      return;
    }

    const elementoActual = nuevoOrden[index];
    const elementoDestino = nuevoOrden[nuevoIndex];

    if (!elementoActual || !elementoDestino) {
      return;
    }

    nuevoOrden[index] = elementoDestino;
    nuevoOrden[nuevoIndex] = elementoActual;

    nuevoOrden.forEach((item, idx) => {
      if (item) {
        item.secuencia = idx + 1;
      }
    });

    setOrdenEditado([...nuevoOrden]);
  };

  const guardarOrden = async (ruta: RutaWithExtras) => {
    if (!ruta) return;

    try {
      await cambiarOrdenMutation.mutateAsync({
        ruta_id: ruta.id,
        nuevo_orden: ordenEditado,
        motivo: 'Reordenamiento manual por administrador',
      });
      setRutaEditandoOrden(null);
      setOrdenEditado([]);
      refetch();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const cancelarEdicion = () => {
    setRutaEditandoOrden(null);
    setOrdenEditado([]);
  };

  const cancelarFinalizar = () => {
    setRutaParaFinalizar(null);
    setPedidosEntregados(new Set());
    setPedidosNoEntregados(new Set());
  };

  const estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'planificada', label: 'Planificada' },
    { value: 'activa', label: 'Activa' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'planificada':
        return 'bg-gray-100 text-gray-800';
      case 'activa':
        return 'bg-blue-100 text-blue-800';
      case 'en_curso':
        return 'bg-purple-100 text-purple-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-800">
            <Route className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Gestión de Rutas</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Visualiza y gestiona todas las rutas de entrega asignadas a repartidores
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Filtros y Búsqueda</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVistaAgrupada(!vistaAgrupada)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                vistaAgrupada
                  ? 'border-purple-300 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {vistaAgrupada ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {vistaAgrupada ? 'Agrupada' : 'Lista'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, repartidor, descripción..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtros.estado || ''}
              onChange={(e) => {
                const nuevoEstado = e.target.value;
                setFiltros((prev) => {
                  const nuevosFiltros = { ...prev };
                  if (nuevoEstado) {
                    nuevosFiltros.estado = nuevoEstado;
                  } else {
                    delete nuevosFiltros.estado;
                  }
                  return nuevosFiltros;
                });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              {estados.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {busqueda && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>Mostrando {rutasFiltradas.length} de {rutas.length} rutas</span>
            <button
              onClick={() => setBusqueda('')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Rutas</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <Route className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Curso</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {rutas.filter((r) => r.estado === 'en_curso').length}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {rutas.filter((r) => r.estado === 'completada').length}
              </p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <Route className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Debug info */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error al cargar rutas:</p>
          <p className="mt-1 text-xs text-red-600">{String(error)}</p>
        </div>
      )}

      {/* Lista de Rutas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : rutasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Route className="h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {busqueda ? 'No se encontraron rutas' : 'No hay rutas creadas'}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {busqueda
              ? 'Intenta con otros términos de búsqueda'
              : 'Ve a "Pedidos Asignados" para crear una nueva ruta de entrega.'}
          </p>
          {!busqueda && (
            <Link
              href="/dashboard/pedidos-asignados"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Route className="h-4 w-4" />
              Crear Ruta
            </Link>
          )}
        </div>
      ) : vistaAgrupada ? (
        <div className="space-y-6">
          {Object.entries(rutasAgrupadas).map(([estado, rutasGrupo]) => {
            if (rutasGrupo.length === 0) return null;
            const estaExpandido = gruposExpandidos[estado] ?? true;
            const estadoInfo = estados.find(e => e.value === estado) || { label: estado, value: estado };

            return (
              <div key={estado} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <button
                  onClick={() => setGruposExpandidos(prev => ({ ...prev, [estado]: !prev[estado] }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${getEstadoColor(estado)}`}>
                      {estadoInfo.label}
                    </span>
                    <span className="text-sm text-gray-600">
                      {rutasGrupo.length} {rutasGrupo.length === 1 ? 'ruta' : 'rutas'}
                    </span>
                  </div>
                  {estaExpandido ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {estaExpandido && (
                  <div className="border-t border-gray-200 p-4 space-y-3">
                    {rutasGrupo.map((ruta) => (
                      <RutaCard
                        key={ruta.id}
                        ruta={ruta}
                        rutaExpandida={rutaExpandida}
                        toggleExpandirRuta={toggleExpandirRuta}
                        handleIniciarRuta={handleIniciarRuta}
                        handleAbrirFinalizar={handleAbrirFinalizar}
                        iniciarRutaMutation={iniciarRutaMutation}
                        rutaParaFinalizar={rutaParaFinalizar}
                        pedidosEntregados={pedidosEntregados}
                        pedidosNoEntregados={pedidosNoEntregados}
                        togglePedidoEntregado={togglePedidoEntregado}
                        togglePedidoNoEntregado={togglePedidoNoEntregado}
                        handleFinalizarRuta={handleFinalizarRuta}
                        finalizarRutaMutation={finalizarRutaMutation}
                        rutaEditandoOrden={rutaEditandoOrden}
                        iniciarEdicionOrden={iniciarEdicionOrden}
                        ordenEditado={ordenEditado}
                        moverPedido={moverPedido}
                        guardarOrden={guardarOrden}
                        cancelarEdicion={cancelarEdicion}
                        cancelarFinalizar={cancelarFinalizar}
                        cambiarOrdenMutation={cambiarOrdenMutation}
                        toggleAlternativaMutation={toggleAlternativaMutation}
                        getEstadoColor={getEstadoColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {rutasFiltradas.map((ruta) => (
            <RutaCard
              key={ruta.id}
              ruta={ruta}
              rutaExpandida={rutaExpandida}
              toggleExpandirRuta={toggleExpandirRuta}
              handleIniciarRuta={handleIniciarRuta}
              handleAbrirFinalizar={handleAbrirFinalizar}
              iniciarRutaMutation={iniciarRutaMutation}
              rutaParaFinalizar={rutaParaFinalizar}
              pedidosEntregados={pedidosEntregados}
              pedidosNoEntregados={pedidosNoEntregados}
              togglePedidoEntregado={togglePedidoEntregado}
              togglePedidoNoEntregado={togglePedidoNoEntregado}
              handleFinalizarRuta={handleFinalizarRuta}
              finalizarRutaMutation={finalizarRutaMutation}
              rutaEditandoOrden={rutaEditandoOrden}
              iniciarEdicionOrden={iniciarEdicionOrden}
              ordenEditado={ordenEditado}
              moverPedido={moverPedido}
              guardarOrden={guardarOrden}
              cancelarEdicion={cancelarEdicion}
              cancelarFinalizar={cancelarFinalizar}
              cambiarOrdenMutation={cambiarOrdenMutation}
              toggleAlternativaMutation={toggleAlternativaMutation}
              getEstadoColor={getEstadoColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
