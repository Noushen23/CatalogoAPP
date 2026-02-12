'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminUsersService } from '@/lib/admin-users'
import { RefreshIcon } from '@/components/icons'
import { UserSearchBar } from './UserSearchBar'
import { Pagination } from '../products/Pagination'

interface UsersTableProps {
  filters?: {
    rol: string
    emailVerificado: string
    activo: string
  }
}

export function UsersTable({ filters }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Resetear a la primera página cuando cambien los filtros externos
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const { data: usersResponse, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', debouncedSearchTerm, sortBy, filters, currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        const sortMap: Record<string, string> = {
          'name': 'nombre',
          'name_desc': 'nombre_desc',
          'email': 'email',
          'email_desc': 'email_desc',
          'created': 'recientes',
          'created_desc': 'recientes'
        }
        
        const backendSortBy = sortMap[sortBy] || 'recientes'
        
        const backendFilters: Record<string, string | number | boolean | undefined> = {
          search: debouncedSearchTerm || undefined,
          page: currentPage,
          limit: itemsPerPage,
          sortBy: backendSortBy
        }
        
        if (filters?.rol && filters.rol !== 'all') {
          backendFilters.rol = filters.rol
        }
        
        if (filters?.emailVerificado && filters.emailVerificado !== 'all') {
          backendFilters.emailVerificado = filters.emailVerificado === 'true'
        }
        
        if (filters?.activo && filters.activo !== 'all') {
          backendFilters.activo = filters.activo === 'true'
        }

        const response = await AdminUsersService.getUsers(backendFilters)
        return response
      } catch (error) {
        console.error('❌ UsersTable: Error al obtener usuarios:', error)
        throw error
      }
    },
  })

  const users = usersResponse?.data || []
  const pagination = usersResponse?.pagination

  const getRoleBadge = (rol: string) => {
    if (rol === 'admin') {
      return { text: 'Admin', color: 'bg-purple-100 text-purple-800' }
    }
    return { text: 'Cliente', color: 'bg-blue-100 text-blue-800' }
  }


  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return '-'
    }
  }

  const skeletonItems = Array.from({ length: 5 }, (_, idx) => ({
    id: `skeleton-${idx}`,
  }))

  if (isLoading) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            {skeletonItems.map((item) => (
              <div key={item.id} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <UserSearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onSortChange={handleSortChange}
        sortBy={sortBy}
        totalResults={users?.length || 0}
      />

      {/* Tabla de usuarios */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Usuarios ({pagination?.totalItems || 0})
            </h3>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshIcon 
                size={16} 
                className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Verificado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const roleBadge = getRoleBadge(user.rol)
                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-base font-medium text-blue-600">
                                {user.nombreCompleto.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.nombreCompleto || 'Sin nombre'}
                              </div>
                              {user.telefono && (
                                <div className="text-xs text-gray-500">
                                  {user.telefono}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
                            {roleBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.emailVerificado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.emailVerificado ? 'Verificado' : 'No Verificado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.fechaCreacion)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.ultimoAcceso ? formatDate(user.ultimoAcceso) : 'Nunca'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  )
}
