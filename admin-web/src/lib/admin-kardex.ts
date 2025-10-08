import { KardexResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getKardexByFormaPago(fecha: string, formapago: string = 'MU'): Promise<KardexResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kardex/formapago?fecha=${fecha}&formapago=${formapago}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching kardex data:', error)
    throw error
  }
}

export async function getKardexResumen(fechaInicio: string, fechaFin: string, formapago?: string): Promise<any> {
  try {
    const url = new URL(`${API_BASE_URL}/api/kardex/resumen`)
    url.searchParams.append('fechaInicio', fechaInicio)
    url.searchParams.append('fechaFin', fechaFin)
    if (formapago) {
      url.searchParams.append('formapago', formapago)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching kardex resumen:', error)
    throw error
  }
}
