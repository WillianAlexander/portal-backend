import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SolicitudViaticosService } from '../domain/solicitud-viaticos.service';
import { SolicitarAnticipoViaticosHandler } from './solicitar-anticipo-viaticos.handler';
import { AprobarAnticipoViaticosHandler } from './aprobar-anticipo-viaticos.handler';
import { RechazarAnticipoViaticosHandler } from './rechazar-anticipo-viaticos.handler';
import { GenerarOrdenPagoViaticosHandler } from './generar-orden-pago-viaticos.handler';
import { ActionContext } from '../../workflow/types/action-context.type';

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    instanciaId: 20,
    cflujo: 'VIATICOS_ANTICIPO',
    cmodulo: 'TALENTO_HUMANO',
    cproceso: 'VIATICOS',
    cfase: 'VIA_SOLICITUD',
    caccion: 'SOLICITAR_ANTICIPO_VIA',
    usuario: 'emp02',
    usuarioSolicitante: 'emp02',
    tipoEntidad: null,
    idEntidad: null,
    inputJson: null,
    ...overrides,
  };
}

const fakeTx = {} as any;
const mockRegistry = { register: jest.fn() } as any;

describe('SolicitarAnticipoViaticosHandler', () => {
  let handler: SolicitarAnticipoViaticosHandler;
  let solicitudService: jest.Mocked<SolicitudViaticosService>;

  beforeEach(() => {
    solicitudService = { crearOActualizar: jest.fn() } as any;
    handler = new SolicitarAnticipoViaticosHandler(solicitudService, mockRegistry);
  });

  it('llama crearOActualizar con los datos del contexto e inputJson', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      inputJson: {
        destino: 'Quito',
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-05',
        montoAnticipo: 250,
        motivoViaje: 'Capacitación',
      },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      20,
      {
        destino: 'Quito',
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-05',
        montoAnticipo: 250,
        motivoViaje: 'Capacitación',
        usuarioSolicitante: 'emp02',
        usuarioCreacion: 'emp02',
      },
      fakeTx,
    );
    expect(result.mensaje).toContain('emp02');
  });

  it('usa context.usuarioSolicitante (no context.usuario) como solicitante', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      usuario: 'MOTOR_WORKFLOW',
      usuarioSolicitante: 'emp03',
      inputJson: {
        destino: 'Guayaquil',
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-03',
        montoAnticipo: 150,
      },
    });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ usuarioSolicitante: 'emp03', usuarioCreacion: 'MOTOR_WORKFLOW' }),
      fakeTx,
    );
  });

  it('propaga el error de dominio sin envolverlo', async () => {
    solicitudService.crearOActualizar.mockRejectedValue(
      new BadRequestException('montoAnticipo debe ser mayor a cero'),
    );
    const ctx = makeCtx({
      inputJson: {
        destino: 'Quito',
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-05',
        montoAnticipo: -50,
      },
    });

    await expect(handler.execute(ctx, fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('AprobarAnticipoViaticosHandler', () => {
  let handler: AprobarAnticipoViaticosHandler;
  let solicitudService: jest.Mocked<SolicitudViaticosService>;

  beforeEach(() => {
    solicitudService = { aprobar: jest.fn() } as any;
    handler = new AprobarAnticipoViaticosHandler(solicitudService, mockRegistry);
  });

  it('llama aprobar con instanciaId y el usuario del contexto', async () => {
    solicitudService.aprobar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      cfase: 'VIA_APROBACION_JEFE',
      caccion: 'APROBAR_ANTICIPO_VIA',
      usuario: 'jefe02',
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.aprobar).toHaveBeenCalledWith(20, 'jefe02', fakeTx);
    expect(result.mensaje).toContain('jefe02');
  });

  it('propaga BadRequestException si la solicitud no está en PENDIENTE', async () => {
    solicitudService.aprobar.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'APROBADA'. Se esperaba 'PENDIENTE'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('RechazarAnticipoViaticosHandler', () => {
  let handler: RechazarAnticipoViaticosHandler;
  let solicitudService: jest.Mocked<SolicitudViaticosService>;

  beforeEach(() => {
    solicitudService = { rechazar: jest.fn() } as any;
    handler = new RechazarAnticipoViaticosHandler(solicitudService, mockRegistry);
  });

  it('llama rechazar con el motivo del inputJson', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      cfase: 'VIA_APROBACION_JEFE',
      caccion: 'RECHAZAR_ANTICIPO_VIA',
      usuario: 'jefe02',
      inputJson: { motivo: 'Fondos insuficientes' },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(20, 'jefe02', 'Fondos insuficientes', fakeTx);
    expect(result.mensaje).toContain('jefe02');
  });

  it('llama rechazar con motivo null cuando inputJson no tiene motivo', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({ inputJson: null });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(20, expect.any(String), null, fakeTx);
  });
});

describe('GenerarOrdenPagoViaticosHandler', () => {
  let handler: GenerarOrdenPagoViaticosHandler;
  let solicitudService: jest.Mocked<SolicitudViaticosService>;

  beforeEach(() => {
    solicitudService = { generarOrdenPago: jest.fn() } as any;
    handler = new GenerarOrdenPagoViaticosHandler(solicitudService, mockRegistry);
  });

  it('llama generarOrdenPago y retorna la ref en outputJson', async () => {
    solicitudService.generarOrdenPago.mockResolvedValue('OP-20-1234567890');
    const ctx = makeCtx({
      cfase: 'VIA_CIERRE_ANTICIPO',
      caccion: 'GENERAR_ORDEN_PAGO_VIA',
      usuario: 'MOTOR_WORKFLOW',
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.generarOrdenPago).toHaveBeenCalledWith(20, fakeTx);
    expect(result.outputJson).toEqual({ ordenPagoRef: 'OP-20-1234567890' });
    expect(result.mensaje).toContain('OP-20-1234567890');
  });

  it('propaga NotFoundException si la solicitud no está en APROBADA', async () => {
    solicitudService.generarOrdenPago.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'PENDIENTE'. Se esperaba 'APROBADA'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });

  it('propaga NotFoundException si no existe la solicitud', async () => {
    solicitudService.generarOrdenPago.mockRejectedValue(
      new NotFoundException('No existe solicitud de viáticos para la instancia 20'),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(NotFoundException);
  });
});
