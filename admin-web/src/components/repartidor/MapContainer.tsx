'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { useMemo } from 'react';

import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox';




import { MapPin } from 'lucide-react';

import { Entrega } from '@/lib/delivery';

interface MapContainerProps {
  entregaSeleccionada: Entrega | null;
  entregas: Entrega[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const defaultCenter = { lat: 4.6097, lng: -74.0817 }; // Bogotá

const deliveriesLayer = {
  id: 'deliveries-circle',
  type: 'circle' as const,
  paint: {
    'circle-radius': 6,
    'circle-color': '#F59E0B',
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#FFFFFF',
  },
};

export function MapContainer({
  entregaSeleccionada,
  entregas,
}: MapContainerProps) {
  const mapCenter = useMemo(() => {
    if (entregaSeleccionada?.latitud && entregaSeleccionada?.longitud) {
      return { lat: entregaSeleccionada.latitud, lng: entregaSeleccionada.longitud };
    }
    return defaultCenter;
  }, [entregaSeleccionada]);

  const entregasGeoJson: GeoJSON.FeatureCollection = useMemo(() => {
    const features = entregas
      .filter((entrega) => typeof entrega.longitud === 'number' && typeof entrega.latitud === 'number')
      .map((entrega) => ({
        type: 'Feature' as const,
        properties: {
          id: entrega.id,
          numero_orden: entrega.numero_orden,
          estado: entrega.estado,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [entrega.longitud!, entrega.latitud!],
        },
      }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [entregas]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/70 p-6 text-sm text-yellow-800">
        <p className="text-base font-semibold">Configura tu API key de Mapbox</p>
        <p className="max-w-md text-center">
          Define la variable <code className="rounded bg-yellow-100 px-1">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code>{' '}
          en tu entorno y reinicia el servidor para habilitar el mapa interactivo.
        </p>
        <p className="text-xs">Sugeridos: <code>@vis.gl/react-map-gl</code> (instalado) o cualquier proveedor Mapbox compatible.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-gray-200">
      {/* @ts-expect-error - react-map-gl types may need TypeScript server restart */}
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: mapCenter.lat,
          longitude: mapCenter.lng,
          zoom: 13,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {entregasGeoJson.features.length > 0 && (
          <Source id="delivery-points" type="geojson" data={entregasGeoJson}>
            <Layer {...deliveriesLayer} />
          </Source>
        )}

        {entregaSeleccionada?.latitud && entregaSeleccionada?.longitud && (
          <Marker
            longitude={entregaSeleccionada.longitud}
            latitude={entregaSeleccionada.latitud}
            anchor="bottom"
          >
            <div className="rounded-full bg-green-600 p-2 shadow-lg">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}



