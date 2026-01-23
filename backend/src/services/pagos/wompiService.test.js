const axios = require('axios');
const crypto = require('crypto');

// Mock de axios antes de importar el servicio
jest.mock('axios');

describe('WompiService', () => {
  let wompiService;
  let mockAxiosInstance;

  beforeEach(() => {
    // Limpiar el cache del módulo para obtener una nueva instancia
    jest.resetModules();
    
    // Crear instancia mock de axios
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    
    // Mock de axios.create antes de importar el servicio
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Importar el servicio después de configurar los mocks
    wompiService = require('./wompiService');
    
    // Reemplazar el cliente axios del servicio con nuestro mock
    wompiService.cliente = mockAxiosInstance;
    
    // Configurar valores por defecto para las pruebas
    wompiService.configuracion.claveIntegridad = 'test_integrity_key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearTransaccion', () => {
    const datosTransaccionValidos = {
      referencia: 'PED-12345-1234567890',
      monto: 100000, // 1000 COP en centavos
      moneda: 'COP',
      cliente: {
        email: 'cliente@example.com',
        nombre: 'Juan Pérez',
        telefono: '+573001234567',
        tipoIdentificacion: 'CC',
        numeroIdentificacion: '1234567890'
      },
      metodoPago: {
        tipo: 'CARD',
        tokenTarjeta: 'tok_test_xxxxx',
        cuotas: 1
      }
    };

    it('debería crear una transacción exitosamente con tarjeta', async () => {
      const respuestaMock = {
        data: {
          data: {
            id: '12345',
            reference: 'PED-12345-1234567890',
            status: 'PENDING',
            amount_in_cents: 100000,
            currency: 'COP',
            payment_method_type: 'CARD',
            redirect_url: 'https://wompi.co/redirect',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(respuestaMock);

      const resultado = await wompiService.crearTransaccion(datosTransaccionValidos);

      expect(resultado.exito).toBe(true);
      expect(resultado.datos.idTransaccion).toBe('12345');
      expect(resultado.datos.referencia).toBe('PED-12345-1234567890');
      expect(resultado.datos.estado).toBe('PENDING');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          amount_in_cents: 100000,
          currency: 'COP',
          customer_email: 'cliente@example.com',
          payment_method: expect.objectContaining({
            type: 'CARD',
            token: 'tok_test_xxxxx',
            installments: 1
          })
        })
      );
    });

    it('debería crear una transacción exitosamente con PSE', async () => {
      const datosPSE = {
        ...datosTransaccionValidos,
        metodoPago: {
          tipo: 'PSE',
          banco: '1', // financial_institution_code (en Sandbox: "1"=APPROVED)
          tipoPersona: 0, // 0 = Natural, 1 = Jurídica
          tipoIdentificacion: 'CC',
          numeroIdentificacion: '1999888777',
          descripcionPago: 'Pago de pedido'
        }
      };

      const respuestaMock = {
        data: {
          data: {
            id: '12346',
            reference: 'PED-12345-1234567890',
            status: 'PENDING',
            amount_in_cents: 100000,
            currency: 'COP',
            payment_method_type: 'PSE',
            redirect_url: 'https://wompi.co/redirect',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(respuestaMock);

      const resultado = await wompiService.crearTransaccion(datosPSE);

      expect(resultado.exito).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          payment_method: expect.objectContaining({
            type: 'PSE',
            user_type: 0, // 0 = Natural
            user_legal_id_type: 'CC',
            user_legal_id: '1999888777',
            financial_institution_code: '1',
            payment_description: 'Pago de pedido'
          })
        })
      );
    });

    it('debería fallar si faltan datos requeridos', async () => {
      const datosIncompletos = {
        referencia: 'PED-12345',
        // Faltan monto, cliente, metodoPago
      };

      const resultado = await wompiService.crearTransaccion(datosIncompletos);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('Faltan datos requeridos');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('debería fallar si el monto es menor al mínimo (100000 centavos)', async () => {
      const datosMontoInvalido = {
        ...datosTransaccionValidos,
        monto: 50000 // Menor a 100000 centavos
      };

      const resultado = await wompiService.crearTransaccion(datosMontoInvalido);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('monto mínimo');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('debería fallar si falta el token de tarjeta para pagos CARD', async () => {
      const datosSinToken = {
        ...datosTransaccionValidos,
        metodoPago: {
          tipo: 'CARD',
          // Falta tokenTarjeta
        }
      };

      const resultado = await wompiService.crearTransaccion(datosSinToken);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('token de la tarjeta');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('debería fallar si faltan datos bancarios para PSE', async () => {
      const datosPSEIncompletos = {
        ...datosTransaccionValidos,
        metodoPago: {
          tipo: 'PSE',
          // Faltan banco, tipoPersona y numeroIdentificacion
        }
      };

      const resultado = await wompiService.crearTransaccion(datosPSEIncompletos);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('banco y tipo de persona');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('debería fallar si falta número de identificación para PSE', async () => {
      const datosPSESinIdentificacion = {
        ...datosTransaccionValidos,
        metodoPago: {
          tipo: 'PSE',
          banco: '1',
          tipoPersona: 0,
          // Falta numeroIdentificacion
        }
      };

      const resultado = await wompiService.crearTransaccion(datosPSESinIdentificacion);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('número de identificación');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('debería manejar errores de la API de Wompi', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid payment method'
            }
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      const resultado = await wompiService.crearTransaccion(datosTransaccionValidos);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toBeDefined();
      expect(resultado.detalles).toBeDefined();
    });
  });

  describe('consultarTransaccion', () => {
    it('debería consultar una transacción exitosamente', async () => {
      const idTransaccion = '12345';
      const respuestaMock = {
        data: {
          data: {
            id: '12345',
            reference: 'PED-12345-1234567890',
            status: 'APPROVED',
            amount_in_cents: 100000,
            currency: 'COP',
            payment_method_type: 'CARD',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            finalized_at: '2024-01-01T00:05:00Z',
            status_message: 'Transaction approved'
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(respuestaMock);

      const resultado = await wompiService.consultarTransaccion(idTransaccion);

      expect(resultado.exito).toBe(true);
      expect(resultado.datos.idTransaccion).toBe('12345');
      expect(resultado.datos.estado).toBe('APPROVED');
      expect(resultado.datos.monto).toBe(100000);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/transactions/${idTransaccion}`);
    });

    it('debería fallar si no se proporciona el ID de transacción', async () => {
      const resultado = await wompiService.consultarTransaccion(null);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('ID de transacción es requerido');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('debería manejar errores de la API de Wompi', async () => {
      const idTransaccion = '12345';
      const errorResponse = {
        response: {
          data: {
            error: {
              type: 'NOT_FOUND',
              message: 'Transaction not found'
            }
          }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      const resultado = await wompiService.consultarTransaccion(idTransaccion);

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toBeDefined();
    });
  });

  describe('validarFirmaWebhook', () => {
    it('debería validar correctamente una firma válida', () => {
      const datosWebhook = {
        event: 'transaction.updated',
        data: {
          id: '12345',
          reference: 'PED-12345-1234567890',
          status: 'APPROVED'
        }
      };

      const claveIntegridad = 'test_integrity_key';
      const datosString = JSON.stringify(datosWebhook);
      
      // Calcular la firma esperada usando crypto real
      const firmaEsperada = crypto
        .createHash('sha256')
        .update(datosString + claveIntegridad)
        .digest('hex');

      // Configurar la clave de integridad en el servicio
      wompiService.configuracion.claveIntegridad = claveIntegridad;

      const resultado = wompiService.validarFirmaWebhook(datosWebhook, firmaEsperada);

      expect(resultado).toBe(true);
    });

    it('debería rechazar una firma inválida', () => {
      const datosWebhook = {
        event: 'transaction.updated',
        data: {
          id: '12345',
          reference: 'PED-12345-1234567890',
          status: 'APPROVED'
        }
      };

      const claveIntegridad = 'test_integrity_key';
      const firmaInvalida = 'firma_invalida';

      // Configurar la clave de integridad en el servicio
      wompiService.configuracion.claveIntegridad = claveIntegridad;

      const resultado = wompiService.validarFirmaWebhook(datosWebhook, firmaInvalida);

      expect(resultado).toBe(false);
    });

    it('debería retornar false si no hay clave de integridad configurada', () => {
      const datosWebhook = {
        event: 'transaction.updated',
        data: { id: '12345' }
      };

      wompiService.configuracion.claveIntegridad = '';

      const resultado = wompiService.validarFirmaWebhook(datosWebhook, 'cualquier_firma');

      expect(resultado).toBe(false);
    });
  });

  describe('procesarWebhook', () => {
    it('debería procesar un webhook válido exitosamente', () => {
      const datosWebhook = {
        event: 'transaction.updated',
        data: {
          id: '12345',
          reference: 'PED-12345-1234567890',
          status: 'APPROVED',
          amount_in_cents: 100000,
          currency: 'COP',
          payment_method_type: 'CARD',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          finalized_at: '2024-01-01T00:05:00Z',
          status_message: 'Transaction approved'
        }
      };

      const claveIntegridad = 'test_integrity_key';
      wompiService.configuracion.claveIntegridad = claveIntegridad;
      
      const datosString = JSON.stringify(datosWebhook);
      const firmaValida = crypto
        .createHash('sha256')
        .update(datosString + claveIntegridad)
        .digest('hex');

      const resultado = wompiService.procesarWebhook(datosWebhook, firmaValida);

      expect(resultado.exito).toBe(true);
      expect(resultado.evento).toBe('transaction.updated');
      expect(resultado.datos.idTransaccion).toBe('12345');
      expect(resultado.datos.estado).toBe('APPROVED');
    });

    it('debería fallar si la firma es inválida', () => {
      const datosWebhook = {
        event: 'transaction.updated',
        data: { id: '12345' }
      };

      jest.spyOn(wompiService, 'validarFirmaWebhook').mockReturnValue(false);

      const resultado = wompiService.procesarWebhook(datosWebhook, 'firma_invalida');

      expect(resultado.exito).toBe(false);
      expect(resultado.error).toContain('Firma de webhook inválida');
    });
  });

  describe('obtenerBancosPSE', () => {
    it('debería obtener la lista de bancos PSE exitosamente', async () => {
      const respuestaMock = {
        data: {
          data: [
            {
              financial_institution_code: '1022',
              financial_institution_name: 'Banco de Bogotá'
            },
            {
              financial_institution_code: '1052',
              financial_institution_name: 'Banco de Occidente'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(respuestaMock);

      const resultado = await wompiService.obtenerBancosPSE();

      expect(resultado.exito).toBe(true);
      expect(resultado.bancos).toHaveLength(2);
      expect(resultado.bancos[0].financial_institution_code).toBe('1022');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pse/financial_institutions');
    });

    it('debería manejar errores al obtener bancos PSE', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              type: 'API_ERROR',
              message: 'Failed to fetch banks'
            }
          }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      const resultado = await wompiService.obtenerBancosPSE();

      expect(resultado.exito).toBe(false);
      expect(resultado.bancos).toEqual([]);
    });
  });

  describe('obtenerConfiguracionPublica', () => {
    it('debería retornar la configuración pública sin datos sensibles', () => {
      wompiService.configuracion.ambiente = 'pruebas';
      wompiService.configuracion.clavePublica = 'pub_test_xxxxx';
      wompiService.configuracion.moneda = 'COP';
      wompiService.urlBase = 'https://sandbox.wompi.co/v1';

      const configuracion = wompiService.obtenerConfiguracionPublica();

      expect(configuracion).toEqual({
        ambiente: 'pruebas',
        clavePublica: 'pub_test_xxxxx',
        moneda: 'COP',
        urlBase: 'https://sandbox.wompi.co/v1'
      });

      // Verificar que no incluye datos sensibles
      expect(configuracion.clavePrivada).toBeUndefined();
      expect(configuracion.claveIntegridad).toBeUndefined();
    });
  });
});
