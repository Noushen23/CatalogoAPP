declare module 'react-map-gl/mapbox' {
  import * as React from 'react';

  export interface MapProps {
    mapboxAccessToken: string;
    initialViewState?: {
      latitude: number;
      longitude: number;
      zoom?: number;
      bearing?: number;
      pitch?: number;
    };
    viewState?: {
      latitude: number;
      longitude: number;
      zoom?: number;
      bearing?: number;
      pitch?: number;
    };
    style?: React.CSSProperties;
    mapStyle?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export interface SourceProps {
    id: string;
    type: 'geojson' | 'vector' | 'raster' | 'image' | 'video' | 'canvas';
    data?: unknown;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export interface LayerProps {
    id?: string;
    type: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    filter?: unknown[];
    [key: string]: unknown;
  }

  export interface MarkerProps {
    longitude: number;
    latitude: number;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export const Map: React.FC<MapProps>;
  export const Source: React.FC<SourceProps>;
  export const Layer: React.FC<LayerProps>;
  export const Marker: React.FC<MarkerProps>;
}

