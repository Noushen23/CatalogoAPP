'use client';

import { use } from 'react';
import { DetalleRepartidor } from '@/components/repartidores/DetalleRepartidor';

export default function RepartidorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Detalle del Repartidor</h1>
        <p className="text-gray-600 mt-1">Información completa y estadísticas</p>
      </div>
      <DetalleRepartidor repartidorId={id} />
    </div>
  );
}

