import ApiClient from './apiClient';
import type { ApiResponse } from './apiClient';

/**
 * Interfaces para verificación de email
 */
export interface VerificationStatusResponse {
  emailVerificado: boolean;
  codigoEnviado: boolean;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface VerifyEmailResponse {
  emailVerificado: boolean;
}

export interface ResendVerificationResponse {
  email: string;
  messageId?: string;
}

/**
 * API Client para verificación de email
 */
class EmailVerificationApi extends ApiClient {
  /**
   * Obtener estado de verificación del usuario
   * GET /auth/verification-status
   */
  async getVerificationStatus(): Promise<ApiResponse<VerificationStatusResponse>> {
    return this.get<VerificationStatusResponse>('/auth/verification-status');
  }

  /**
   * Verificar email con código
   * POST /auth/verify-email
   */
  async verifyEmail(code: string): Promise<ApiResponse<VerifyEmailResponse>> {
    return this.post<VerifyEmailResponse>('/auth/verify-email', { code });
  }

  /**
   * Reenviar código de verificación
   * POST /auth/resend-verification
   */
  async resendVerification(): Promise<ApiResponse<ResendVerificationResponse>> {
    return this.post<ResendVerificationResponse>('/auth/resend-verification');
  }
}

// Exportar instancia única
export const emailVerificationApi = new EmailVerificationApi();

