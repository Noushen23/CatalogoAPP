import { HomeIcon } from './HomeIcon';
import { CubeIcon } from './CubeIcon';
import { TagIcon } from './TagIcon';
import { DocumentTextIcon } from './DocumentTextIcon';
import { RefreshIcon } from './RefreshIcon';
import { SpinnerIcon } from './SpinnerIcon';
import { PlusIcon } from './PlusIcon';
import { PhotoIcon } from './PhotoIcon';
import { PencilIcon } from './PencilIcon';
import { TrashIcon } from './TrashIcon';
import { ExclamationTriangleIcon } from './ExclamationTriangleIcon';
import { ShoppingBagIcon } from './ShoppingBagIcon';
import { RouteIcon } from './RouteIcon';
import { IconProps } from './types';

/**
 * Tipos de iconos disponibles
 */
export type IconName =
  | 'home'
  | 'cube'
  | 'tag'
  | 'document-text'
  | 'refresh'
  | 'spinner'
  | 'plus'
  | 'photo'
  | 'pencil'
  | 'trash'
  | 'exclamation-triangle'
  | 'shopping-bag'
  | 'route';

interface IconComponentProps extends IconProps {
  /**
   * Nombre del icono a renderizar
   */
  name: IconName;
}

/**
 * Mapeo de nombres a componentes de iconos
 */
const iconMap = {
  home: HomeIcon,
  cube: CubeIcon,
  tag: TagIcon,
  'document-text': DocumentTextIcon,
  refresh: RefreshIcon,
  spinner: SpinnerIcon,
  plus: PlusIcon,
  photo: PhotoIcon,
  pencil: PencilIcon,
  trash: TrashIcon,
  'exclamation-triangle': ExclamationTriangleIcon,
  'shopping-bag': ShoppingBagIcon,
  route: RouteIcon,
} as const;

/**
 * Componente wrapper para renderizar iconos por nombre
 * 
 * @example
 * ```tsx
 * <Icon name="home" size={20} className="text-blue-500" />
 * ```
 */
export function Icon({ name, ...props }: IconComponentProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" no encontrado`);
    return null;
  }
  
  return <IconComponent {...props} />;
}

