'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { authService } from '@/lib/auth'
import { User } from '@/types'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await authService.checkStatus()
        
        if (result && result.user) {
          // Permitir acceso a admin, moderator y repartidor
          const allowedRoles: string[] = ['admin', 'moderator', 'repartidor']
          if (allowedRoles.includes(result.user.roles)) {
            console.log('✅ Dashboard Layout: Usuario autenticado correctamente')
            setUser(result.user)
          } else {
            console.error('❌ Dashboard Layout: Rol no permitido:', result.user.roles)
            // Limpiar datos inválidos
            authService.logout()
          }
        } else {
          console.log('⚠️ Dashboard Layout: No hay usuario autenticado, redirigiendo al login')
          router.push('/')
        }
      } catch (error) {
        console.error('❌ Dashboard Layout: Error verificando autenticación:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            duration: 5000,
          },
        }}
      />
      
      <Sidebar />
      <div className="lg:pl-64">
        <Header user={user} />
        <main className="py-8">
          <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
