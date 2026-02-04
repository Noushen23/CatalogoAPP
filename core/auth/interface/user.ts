export interface User {
  readonly id: string;
  readonly email: string;
  nombreCompleto: string;
  nombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  telefono?: string;
  direccion?: string;
  tipoIdentificacion?: 'CC' | 'NIT' | 'CE' | 'TR';
  numeroIdentificacion?: string;
  rol: 'cliente' | 'admin' | 'vendedor';
  emailVerificado: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}
