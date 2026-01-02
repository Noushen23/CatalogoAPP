'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons/Icon'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface NavigationItem {
  name: string
  href?: string
  icon: IconName | React.ReactNode
  children?: Array<{
    name: string
    href: string
    icon?: React.ReactNode
  }>
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as IconName },
  { name: 'Productos', href: '/dashboard/products', icon: 'cube' as IconName },
  { name: 'Categorías', href: '/dashboard/categories', icon: 'tag' as IconName },
  { name: 'Pedidos', href: '/dashboard/orders', icon: 'shopping-bag' as IconName },
  { name: 'Pedidos Asignados', href: '/dashboard/pedidos-asignados', icon: 'route' as IconName },
  { name: 'Rutas', href: '/dashboard/rutas', icon: 'route' as IconName },
  { name: 'Usuarios', href: '/dashboard/users', icon: 'home' as IconName },
  { name: 'Repartidores', href: '/dashboard/repartidores', icon: 'route' as IconName },
]

interface NavItemProps {
  item: NavigationItem
  pathname: string
  isExpanded: boolean
  onToggle: () => void
}

function NavItem({ item, pathname, isExpanded, onToggle }: NavItemProps) {
  const searchParams = useSearchParams()
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname === item.href || (hasChildren && item.href && pathname.startsWith(item.href))
    const isChildActive = hasChildren && item.children && item.children.some((child) => {
    const childPath = child.href.split('?')[0] || ''
    const queryString = child.href.split('?')[1]
    const childTab = queryString ? new URLSearchParams(queryString).get('tab') : null
    const currentTab = searchParams.get('tab')
    
    if (pathname !== childPath && childPath && !pathname.startsWith(childPath)) return false
    if (childTab && currentTab !== childTab) return false
    if (!childTab && currentTab) return false // Si el child no tiene tab pero la URL sí, no está activo
    return true
  })

  if (hasChildren) {
    // No necesitamos prevenir la navegación - el useEffect se encargará de expandir

    return (
      <div>
        <div className="flex items-center group">
          {item.href && (
            <Link
              href={item.href}
              className={`${
                isActive || isChildActive
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center flex-1 px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors cursor-pointer`}
            >
              {typeof item.icon === 'string' ? (
              <Icon
                name={item.icon as IconName}
                size={20}
                className={`${
                  isActive || isChildActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-3`}
              />
              ) : (
                <span className={`${
                  isActive || isChildActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-3`}>
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.name}</span>
            </Link>
          )}
          {!item.href && (
            <div
              className={`${
                isActive || isChildActive
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600'
              } group flex items-center flex-1 px-2 py-2 text-sm font-medium rounded-md border-l-4`}
            >
              {typeof item.icon === 'string' ? (
              <Icon
                name={item.icon as IconName}
                size={20}
                className={`${
                  isActive || isChildActive ? 'text-blue-500' : 'text-gray-400'
                } mr-3`}
              />
              ) : (
                <span className={`${
                  isActive || isChildActive ? 'text-blue-500' : 'text-gray-400'
                } mr-3`}>
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onToggle()
            }}
            className={`${
              isActive || isChildActive
                ? 'text-blue-600 hover:bg-blue-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            } p-1.5 rounded-md transition-colors ml-1 flex-shrink-0`}
            aria-label={isExpanded ? 'Contraer menú' : 'Expandir menú'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
        {isExpanded && item.children && (
          <div className="mt-1 ml-4 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
            {item.children.map((child) => {
              const childPath = child.href.split('?')[0] || ''
              const queryString = child.href.split('?')[1]
              const childTab = queryString ? new URLSearchParams(queryString).get('tab') : null
              const currentTab = searchParams.get('tab')
              
              // Determinar si este child está activo
              let isChildActive = false
              
              // Para children con tab, verificar que el pathname y el tab coincidan
              if (pathname === childPath) {
                if (childTab && currentTab === childTab) {
                  isChildActive = true
                } else if (!childTab && !currentTab) {
                  isChildActive = true
                }
              }
              
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`${
                    isChildActive
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                  } group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-2 transition-colors`}
                >
                  {child.icon && (
                    <span
                      className={`${
                        isChildActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3`}
                    >
                      {child.icon}
                    </span>
                  )}
                  {child.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={`${
        isActive
          ? 'bg-blue-50 border-blue-500 text-blue-700'
          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
    >
      {typeof item.icon === 'string' ? (
      <Icon
        name={item.icon as IconName}
        size={20}
        className={`${
          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
        } mr-3`}
      />
      ) : (
        <span className={`${
          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
        } mr-3`}>
          {item.icon}
        </span>
      )}
      {item.name}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleItem = (itemName: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemName]: !prev[itemName],
    }))
  }

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">Tienda Online</p>
          </div>
        </div>
        
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <NavItem
                key={item.name}
              item={item}
              pathname={pathname}
              isExpanded={expandedItems[item.name] || false}
              onToggle={() => toggleItem(item.name)}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}
