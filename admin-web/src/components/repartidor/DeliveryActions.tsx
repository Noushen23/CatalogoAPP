'use client';

import { Entrega } from '@/lib/delivery';
import { Play, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface DeliveryActionsProps {
  entrega: Entrega;
  onIniciar: () => void;
  onRegistrarLlegada: (lat: number, lng: number) => void;
  onCompletar: (datos: { firma_cliente?: string; foto_entrega?: string; observaciones?: string }) => void;
  onCancelar: (motivo: string, detalle?: string) => void;
  estaIniciando: boolean;
  estaRegistrandoLlegada: boolean;
  estaCompletando: boolean;
  estaCancelando: boolean;
}

export function DeliveryActions({
  entrega,
  onIniciar,
  onRegistrarLlegada,
  onCompletar,
  onCancelar,
  estaIniciando,
  estaRegistrandoLlegada,
  estaCompletando,
  estaCancelando,
}: DeliveryActionsProps) {
  const [mostrarCompletar, setMostrarCompletar] = useState(false);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [detalleCancelacion, setDetalleCancelacion] = useState('');

  const obtenerUbicacionActual = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no está disponible'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const manejarRegistrarLlegada = async () => {
    try {
      const ubicacion = await obtenerUbicacionActual();
      onRegistrarLlegada(ubicacion.lat, ubicacion.lng);
    } catch (error) {
      alert('Error al obtener ubicación. Por favor, habilita la geolocalización en tu navegador.');
      console.error('Error al obtener ubicación:', error);
    }
  };

  const manejarCompletar = () => {
    onCompletar({
      ...(observaciones ? { observaciones } : {}),
    });
    setMostrarCompletar(false);
    setObservaciones('');
  };

  const manejarCancelar = () => {
    if (!motivoCancelacion) {
      alert('Por favor, selecciona un motivo de cancelación');
      return;
    }
    onCancelar(motivoCancelacion, detalleCancelacion || undefined);
    setMostrarCancelar(false);
    setMotivoCancelacion('');
    setDetalleCancelacion('');
  };

  if (entrega.estado === 'entregada' || entrega.estado === 'cancelada' || entrega.estado === 'fallida') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 text-gray-600">
          {entrega.estado === 'entregada' && <CheckCircle className="h-5 w-5 text-green-600" />}
          {(entrega.estado === 'cancelada' || entrega.estado === 'fallida') && (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="font-semibold">
            {entrega.estado === 'entregada'
              ? 'Entrega completada'
              : entrega.estado === 'cancelada'
              ? 'Entrega cancelada'
              : 'Entrega fallida'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
      {/* Estado actual */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Estado: {entrega.estado}</span>
        {typeof entrega.distancia_km === 'number' && typeof entrega.tiempo_minutos === 'number' && (
          <span className="text-sm text-gray-600">
            {entrega.distancia_km.toFixed(2)} km • {entrega.tiempo_minutos} min
          </span>
        )}
      </div>

      {/* Acciones según el estado */}
      {entrega.estado === 'asignada' && (
        <button
          onClick={onIniciar}
          disabled={estaIniciando}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-5 w-5" />
          {estaIniciando ? 'Iniciando...' : 'Iniciar Entrega'}
        </button>
      )}

      {entrega.estado === 'en_camino' && (
        <button
          onClick={manejarRegistrarLlegada}
          disabled={estaRegistrandoLlegada}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MapPin className="h-5 w-5" />
          {estaRegistrandoLlegada ? 'Registrando...' : 'Registrar Llegada'}
        </button>
      )}

      {entrega.estado === 'llegada' && (
        <>
          {!mostrarCompletar ? (
            <button
              onClick={() => setMostrarCompletar(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Completar Entrega
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={manejarCompletar}
                  disabled={estaCompletando}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  {estaCompletando ? 'Completando...' : 'Confirmar Entrega'}
                </button>
                <button
                  onClick={() => {
                    setMostrarCompletar(false);
                    setObservaciones('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Botón de cancelar */}
      <>
        {!mostrarCancelar ? (
          <button
            onClick={() => setMostrarCancelar(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors"
          >
            <XCircle className="h-5 w-5" />
            Cancelar Entrega
          </button>
        ) : (
          <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Motivo de cancelación *
              </label>
              <select
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Selecciona un motivo</option>
                <option value="cancelacion_repartidor">Cancelación por repartidor</option>
                <option value="repartidor_no_disponible">Repartidor no disponible</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Detalle (opcional)
              </label>
              <textarea
                value={detalleCancelacion}
                onChange={(e) => setDetalleCancelacion(e.target.value)}
                placeholder="Describe el motivo de la cancelación"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={manejarCancelar}
                disabled={estaCancelando || !motivoCancelacion}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="h-5 w-5" />
                {estaCancelando ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
              <button
                onClick={() => {
                  setMostrarCancelar(false);
                  setMotivoCancelacion('');
                  setDetalleCancelacion('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}


