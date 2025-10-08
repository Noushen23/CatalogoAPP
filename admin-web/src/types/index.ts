export interface User {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: 'admin' | 'user' | 'moderator'
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
  priceOffer?: number
  onOffer?: boolean
  images: ProductImage[]
  slug: string
  gender: Gender
  sizes: Size[]
  stock: number
  minStock?: number
  tags: string[]
  isActive: boolean
  isFeatured?: boolean
  weight?: number
  dimensions?: {
    largo?: number
    ancho?: number
    alto?: number
  } | string
  barcode?: string
  sku?: string
  categoryId?: string
  category?: Category
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

export enum Gender {
  Kid = 'kid',
  Men = 'men',
  Women = 'women',
  Unisex = 'unisex'
}

export enum Size {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
  XXXL = 'XXXL'
}

export interface CreateProductRequest {
  title: string
  description: string
  price: number
  images: (string | ProductImage)[]
  slug?: string
  gender: Gender
  sizes: Size[]
  stock: number
  tags: string[]
  isActive: boolean
  isFeatured?: boolean
  categoryId?: string
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
      rol: 'admin' | 'user' | 'moderator' | 'cliente'
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

export interface KardexItem {
  fecha: string
  formapago_kardex: string
  codigo_material: string
  descripcion_material: string
  unidad_material: string
  codigo_formapago: string
  descripcion_formapago: string
  total_cantidad: number
  total_valor: number
}

export interface KardexResponse {
  success: boolean
  data: {
    filtros: {
      fecha: string
      formapago: string
    }
    totales: {
      registros: number
      cantidadTotal: number
      valorTotal: number
    }
    resultados: KardexItem[]
  }
  timestamp: string
}