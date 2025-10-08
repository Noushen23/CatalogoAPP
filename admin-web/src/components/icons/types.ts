import { SVGProps } from 'react';

/**
 * Props base para todos los iconos
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  /**
   * Tamaño del icono en píxeles
   * @default 24
   */
  size?: number;
  /**
   * Clase CSS adicional
   */
  className?: string;
}

/**
 * Props por defecto para todos los SVG
 */
export const defaultIconProps = {
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
} as const;

