export interface User {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: 'admin' | 'user' | 'moderator' | 'repartidor'
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  url?: string
  url_imagen?: string
  urlImagen?: string
  orden?: number
  alt_text?: string
  esPrincipal?: boolean
  es_principal?: boolean
  fechaCreacion?: string
  fecha_creacion?: string
}

export interface Product {
  id: string
  title: string
  description: string
  price: number
  priceOffer?: number | undefined
  onOffer?: boolean | undefined
  images: ProductImage[]
  slug: string
  stock: number
  minStock?: number | undefined
  tags: string[]
  isActive: boolean
  isFeatured?: boolean | undefined
  weight?: number | undefined
  dimensions?: {
    largo?: number
    ancho?: number
    alto?: number
  } | string | undefined
  barcode?: string | undefined
  sku?: string | undefined
  categoryId?: string | null | undefined
  category?: Category | undefined
  esServicio?: boolean
  es_servicio?: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  slug?: string
  isActive?: boolean
  image?: string
  sortOrder?: number
  parentId?: string
}

export interface CreateProductRequest {
  title: string
  description: string
  price: number
  images: (string | ProductImage)[]
  slug?: string
  stock: number
  tags: string[]
  isActive: boolean
  isFeatured?: boolean
  categoryId?: string | null
  sku?: string
  esServicio?: boolean
  es_servicio?: boolean
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string
}

export interface Order {
  id: string
  status: string
  total: number
  userId: string
  user: User
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  quantity: number
  price: number
  productId: string
  product: Product
  orderId: string
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: {
      id: string
      email: string
      nombreCompleto: string
      telefono?: string
      direccion?: string
      rol: 'admin' | 'user' | 'moderator' | 'cliente' | 'repartidor'
      activo: boolean
      emailVerificado: boolean
      fechaCreacion: string
      fechaActualizacion?: string
      ultimoAcceso?: string
    }
    token: string
    refreshToken?: string
  }
}

export interface DashboardStats {
  totalProducts: number
  activeProducts: number
  totalOrders: number
  totalRevenue: number
  lowStockProducts: number
  recentOrders: Order[]
  topProducts: Product[]
}
