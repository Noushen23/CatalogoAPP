export interface User {
  readonly id: string;
  readonly email: string;
  nombreCompleto: string;
  telefono?: string;
  direccion?: string;
  rol: 'cliente' | 'admin' | 'vendedor';
  emailVerificado: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}
