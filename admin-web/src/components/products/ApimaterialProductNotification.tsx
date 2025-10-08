'use client'

import React from 'react'
import { CheckCircle, AlertCircle, Info, X, Database } from 'lucide-react'

interface ApimaterialProductNotificationProps {
  result: {
    success: boolean
    message: string
    data?: any
    material?: any
    simulated?: boolean
  } | null
  onClose: () => void
}

export default function ApimaterialProductNotification({ result, onClose }: ApimaterialProductNotificationProps) {
  if (!result) return null

  const isSuccess = result.success
  const icon = isSuccess ? CheckCircle : AlertCircle
  const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  const textColor = isSuccess ? 'text-green-800' : 'text-red-800'
  const iconColor = isSuccess ? 'text-green-600' : 'text-red-600'

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border ${bgColor} ${textColor} shadow-lg`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {React.createElement(icon, { 
            className: `h-5 w-5 ${iconColor}` 
          })}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-sm">
              {isSuccess ? 'Producto Creado' : 'Error al Crear Producto'}
            </h3>
            <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded-full">
              Apimaterial
            </span>
          </div>
          
          <p className="mt-1 text-sm">
            {result.message}
          </p>
          
          {result.material && (
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Código:</span>
                <span className="font-medium">{result.material.CODIGO}</span>
              </div>
              <div className="flex justify-between">
                <span>Descripción:</span>
                <span className="font-medium truncate ml-2">{result.material.DESCRIP}</span>
              </div>
              <div className="flex justify-between">
                <span>Precio:</span>
                <span className="font-medium">
                  {result.material.PRECIO1 
                    ? new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(result.material.PRECIO1)
                    : 'Sin precio'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className={`font-medium ${
                  result.material.INACTIVO === 'S' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {result.material.INACTIVO === 'S' ? 'Inactivo' : 'Activo'}
                </span>
              </div>
            </div>
          )}
          
          {result.data && result.success && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs">
              <div className="flex items-center space-x-1">
                <Database className="h-3 w-3 text-green-600" />
                <span className="text-green-700">
                  Producto guardado en MySQL exitosamente
                </span>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}














