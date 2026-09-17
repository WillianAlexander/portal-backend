import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { EstadoSolicitudVacaciones } from '@prisma/client';
import { SolicitudVacacionesService } from '../domain/solicitud-vacaciones.service';
import { SolicitarVacacionesHandler } from './solicitar-vacaciones.handler';
import { AprobarVacacionesHandler } from './aprobar-vacaciones.handler';
import { RechazarVacacionesHandler } from './rechazar-vacaciones.handler';
import { GenerarCertificadoHandler } from './generar-certificado.handler';
import { ActionContext } from '../../workflow/types/action-context.type';

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    instanciaId: 10,
    cflujo: 'FLUJO_VAC',
    cmodulo: 'TALENTO',
    cproceso: 'VACACIONES',
    cfase: 'SOLICITUD',
    caccion: 'SOLICITAR_VACACIONES',
    usuario: 'user01',
    usuarioSolicitante: 'user01',
    tipoEntidad: null,
    idEntidad: null,
    inputJson: null,
    ...overrides,
  };
}

const fakeTx = {} as any;
const mockRegistry = { register: jest.fn() } as any;

describe('SolicitarVacacionesHandler', () => {
  let handler: SolicitarVacacionesHandler;
  let solicitudService: jest.Mocked<SolicitudVacacionesService>;

  beforeEach(() => {
    solicitudService = { crearOActualizar: jest.fn() } as any;
    handler = new SolicitarVacacionesHandler(solicitudService, mockRegistry);
  });

  // Escenario 1: solicitud crea registro con datos correctos y avanza a aprobación
  it('llama crearOActualizar con los datos del contexto e inputJson', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      inputJson: { fechaInicio: '2026-10-01', fechaFin: '2026-10-10', dias: 10 },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      10,
      {
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-10',
        dias: 10,
        usuarioCreacion: 'user01',
        usuarioSolicitante: 'user01',
      },
      fakeTx,
    );
    expect(result.mensaje).toContain('user01');
  });

  // Escenario 9: usuarioSolicitante queda registrado correctamente
  it('usa context.usuarioSolicitante (no context.usuario) como solicitante', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      usuario: 'MOTOR_WORKFLOW',
      usuarioSolicitante: 'user03',
      inputJson: { fechaInicio: '2026-10-01', fechaFin: '2026-10-05', dias: 5 },
    });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ usuarioSolicitante: 'user03', usuarioCreacion: 'MOTOR_WORKFLOW' }),
      fakeTx,
    );
  });

  // Escenario 10: error en handler propaga la excepción (rollback de transacción)
  it('propaga el error de dominio sin envolverlo', async () => {
    solicitudService.crearOActualizar.mockRejectedValue(
      new BadRequestException('fechaFin debe ser posterior a fechaInicio'),
    );
    const ctx = makeCtx({
      inputJson: { fechaInicio: '2026-10-10', fechaFin: '2026-10-01', dias: -9 },
    });

    await expect(handler.execute(ctx, fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('AprobarVacacionesHandler', () => {
  let handler: AprobarVacacionesHandler;
  let solicitudService: jest.Mocked<SolicitudVacacionesService>;

  beforeEach(() => {
    solicitudService = { aprobar: jest.fn() } as any;
    handler = new AprobarVacacionesHandler(solicitudService, mockRegistry);
  });

  // Escenario 8: TACCIONEJECUCION.usuario queda con el aprobador correcto
  it('llama aprobar con instanciaId y el usuario del contexto', async () => {
    solicitudService.aprobar.mockResolvedValue({} as any);
    const ctx = makeCtx({ cfase: 'APROBACION', caccion: 'APROBAR_VACACIONES', usuario: 'jefe01' });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.aprobar).toHaveBeenCalledWith(10, 'jefe01', fakeTx);
    expect(result.mensaje).toContain('jefe01');
  });

  it('propaga BadRequestException si la solicitud no está en PENDIENTE', async () => {
    solicitudService.aprobar.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'APROBADA'. Se esperaba 'PENDIENTE'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('RechazarVacacionesHandler', () => {
  let handler: RechazarVacacionesHandler;
  let solicitudService: jest.Mocked<SolicitudVacacionesService>;

  beforeEach(() => {
    solicitudService = { rechazar: jest.fn() } as any;
    handler = new RechazarVacacionesHandler(solicitudService, mockRegistry);
  });

  // Escenario 2: rechazar termina la instancia con estado RECHAZADO
  it('llama rechazar con el motivo del inputJson', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      cfase: 'APROBACION',
      caccion: 'RECHAZAR_VACACIONES',
      usuario: 'jefe01',
      inputJson: { motivo: 'Período de alta demanda' },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(10, 'jefe01', 'Período de alta demanda', fakeTx);
    expect(result.mensaje).toContain('jefe01');
  });

  it('llama rechazar con motivo null cuando inputJson no tiene motivo', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({ inputJson: null });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(10, expect.any(String), null, fakeTx);
  });
});

describe('GenerarCertificadoHandler', () => {
  let handler: GenerarCertificadoHandler;
  let solicitudService: jest.Mocked<SolicitudVacacionesService>;

  beforeEach(() => {
    solicitudService = { generarCertificado: jest.fn() } as any;
    handler = new GenerarCertificadoHandler(solicitudService, mockRegistry);
  });

  // Escenario 5: GENERAR_CERTIFICADO ejecutado automáticamente por el motor
  it('llama generarCertificado y retorna la ref en outputJson', async () => {
    solicitudService.generarCertificado.mockResolvedValue('CERT-10-1234567890');
    const ctx = makeCtx({
      cfase: 'FINALIZACION',
      caccion: 'GENERAR_CERTIFICADO',
      usuario: 'MOTOR_WORKFLOW',
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.generarCertificado).toHaveBeenCalledWith(10, fakeTx);
    expect(result.outputJson).toEqual({ certificadoRef: 'CERT-10-1234567890' });
    expect(result.mensaje).toContain('CERT-10-1234567890');
  });

  // Escenario 7: error en GENERAR_CERTIFICADO propaga excepción (historial no se corrompe)
  it('propaga NotFoundException si la solicitud no existe o no está APROBADA', async () => {
    solicitudService.generarCertificado.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'PENDIENTE'. Se esperaba 'APROBADA'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });
});
