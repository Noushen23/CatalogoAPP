import { z } from 'zod';

/**
 * Esquema de validación para el formulario de login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Por favor ingresa un email válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Esquema de validación para el formulario de registro
 */
export const registerSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  segundoNombre: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val.trim().length === 0 || (val.trim().length >= 2 && val.trim().length <= 50),
      'El segundo nombre debe tener entre 2 y 50 caracteres'
    ),
  primerApellido: z
    .string()
    .min(1, 'El primer apellido es requerido')
    .min(2, 'El primer apellido debe tener al menos 2 caracteres')
    .max(50, 'El primer apellido no puede exceder 50 caracteres'),
  segundoApellido: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val.trim().length === 0 || (val.trim().length >= 2 && val.trim().length <= 50),
      'El segundo apellido debe tener entre 2 y 50 caracteres'
    ),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Por favor ingresa un email válido'),
  telefono: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || /^\d{7,15}$/.test(val),
      'El teléfono debe tener entre 7 y 15 dígitos'
    ),
  tipoIdentificacion: z
    .enum(['CC', 'NIT', 'CE', 'TR']),
  numeroIdentificacion: z
    .string()
    .min(5, 'El número de identificación debe tener entre 5 y 20 caracteres')
    .max(20, 'El número de identificación debe tener entre 5 y 20 caracteres')
    .regex(/^[a-zA-Z0-9\-]+$/, 'El número de identificación solo puede contener letras, números y guiones'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/(?=.*[a-z])/, 'Debe contener al menos una letra minúscula')
    .regex(/(?=.*[A-Z])/, 'Debe contener al menos una letra mayúscula')
    .regex(/(?=.*\d)/, 'Debe contener al menos un número'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

