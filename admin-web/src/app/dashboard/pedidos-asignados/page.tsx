'use client';

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { usePedidosAsignados } from '@/hooks/usePedidosAsignados';
import { TablaPedidosAsignados } from '@/components/pedidos-asignados/TablaPedidosAsignados';
import { FiltrosPedidosAsignados } from '@/components/pedidos-asignados/FiltrosPedidosAsignados';
import { Truck, RefreshCw, Route, Plus } from 'lucide-react';
import { CrearRutaModal } from '@/components/pedidos-asignados/CrearRutaModal';

const filtrosIniciales: {
  estado?: string;
  repartidor_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  orden_estado?: string;
} = {
  orden_estado: 'en_proceso',
};

export default function PedidosAsignadosPage() {
  const [filtros, setFiltros] = useState<{
    estado?: string;
    repartidor_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    orden_estado?: string;
  }>(filtrosIniciales);

  const [limit, setLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [mostrarCrearRuta, setMostrarCrearRuta] = useState(false);

  const offset = useMemo(() => {
    return (currentPage - 1) * limit;
  }, [currentPage, limit]);

  const { data, isLoading, error, refetch } = usePedidosAsignados({
    ...filtros,
    limit,
    offset,
  });

  const pedidos = data?.pedidos || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const manejarActualizacionFiltros = (valores: Partial<typeof filtros>) => {
    setFiltros((prev) => ({
      ...prev,
      ...valores,
    }));
    setCurrentPage(1);
    setPageInput('1');
  };

  const reiniciarFiltros = () => {
    setFiltros(filtrosIniciales);
    setCurrentPage(1);
    setPageInput('1');
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setPageInput(totalPages.toString());
    }
  }, [currentPage, totalPages]);

  const handleLimitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nuevoLimite = Number(event.target.value);
    setLimit(nuevoLimite);
    setCurrentPage(1);
    setPageInput('1');
  };

  const handlePageChange = (nuevaPagina: number) => {
    if (Number.isNaN(nuevaPagina)) return;
    const paginaValida = Math.min(Math.max(1, nuevaPagina), totalPages);
    setCurrentPage(paginaValida);
    setPageInput(paginaValida.toString());
  };

  const handlePageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPageInput(event.target.value);
  };

  const handlePageInputConfirm = () => {
    const pagina = Number(pageInput);
    if (!pagina || pagina < 1) {
      setPageInput(currentPage.toString());
      return;
    }
    handlePageChange(pagina);
  };

  const manejarEnterEnInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handlePageInputConfirm();
    }
  };

  return (
    <div className="-mx-6 flex min-h-screen flex-col gap-0 sm:-mx-8 lg:-mx-12 xl:-mx-16 2xl:-mx-21">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <div className="flex items-start gap-5">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-800">
            <Truck className="h-6 w-6 text-purple-800" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Pedidos Asignados</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Vista de todos los pedidos asignados a repartidores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarCrearRuta(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear Ruta
          </button>
  
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-2 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Panel de filtros</h2>
          <button
            type="button"
            onClick={() => setMostrarFiltros((prev) => !prev)}
            className="text-sm font-medium text-purple-700 hover:text-purple-800 hover:underline"
          >
            {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>
        {mostrarFiltros && (
          <FiltrosPedidosAsignados
            filtros={filtros}
            onActualizarFiltros={manejarActualizacionFiltros}
            onReset={reiniciarFiltros}
            estaCargando={isLoading}
          />
        )}
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                Total de pedidos asignados: <span className="text-purple-700 font-semibold">{total}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Error al cargar los pedidos asignados. Por favor, intenta nuevamente.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full flex-col p-6">
          <div className="flex-1 overflow-hidden">
            <div className="h-full">
              <TablaPedidosAsignados pedidos={pedidos} estaCargando={isLoading} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Mostrar</span>
              <select
                value={limit}
                onChange={handleLimitChange}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[10, 25, 50, 100].map((option) => (
                  <option key={option} value={option}>
                    {option} pedidos
                  </option>
                ))}
              </select>
              <span>por página</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Página</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputConfirm}
                    onKeyDown={manejarEnterEnInput}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-gray-500">de {totalPages}</span>
                </div>
                <button
                  type="button"
                  onClick={handlePageInputConfirm}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Ir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>



      {mostrarCrearRuta && (
        <CrearRutaModal
          pedidos={pedidos}
          onCerrar={() => setMostrarCrearRuta(false)}
          onRutaCreada={() => {
            refetch();
            setMostrarCrearRuta(false);
          }}
        />
      )}
    </div>
  );
}

