import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SolicitudPermisosService } from '../domain/solicitud-permisos.service';
import { SolicitarPermisoHandler } from './solicitar-permiso.handler';
import { AprobarPermisoHandler } from './aprobar-permiso.handler';
import { RechazarPermisoHandler } from './rechazar-permiso.handler';
import { FinalizarPermisoHandler } from './finalizar-permiso.handler';
import { ActionContext } from '../../workflow/types/action-context.type';

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    instanciaId: 30,
    cflujo: 'PERMISOS_NORMAL',
    cmodulo: 'TALENTO_HUMANO',
    cproceso: 'PERMISOS',
    cfase: 'PER_SOLICITUD',
    caccion: 'SOLICITAR_PERMISO',
    usuario: 'emp01',
    usuarioSolicitante: 'emp01',
    tipoEntidad: null,
    idEntidad: null,
    inputJson: null,
    ...overrides,
  };
}

const fakeTx = {} as any;
const mockRegistry = { register: jest.fn() } as any;

describe('SolicitarPermisoHandler', () => {
  let handler: SolicitarPermisoHandler;
  let solicitudService: jest.Mocked<SolicitudPermisosService>;

  beforeEach(() => {
    solicitudService = { crearOActualizar: jest.fn() } as any;
    handler = new SolicitarPermisoHandler(solicitudService, mockRegistry);
  });

  it('llama crearOActualizar con los datos del contexto e inputJson', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      inputJson: {
        tipoPermiso: 'PERSONAL',
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-02',
        motivoPermiso: 'Trámite personal',
      },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      30,
      {
        tipoPermiso: 'PERSONAL',
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-02',
        motivoPermiso: 'Trámite personal',
        usuarioSolicitante: 'emp01',
        usuarioCreacion: 'emp01',
      },
      fakeTx,
    );
    expect(result.mensaje).toContain('emp01');
  });

  it('usa context.usuarioSolicitante (no context.usuario) como solicitante', async () => {
    solicitudService.crearOActualizar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      usuario: 'MOTOR_WORKFLOW',
      usuarioSolicitante: 'emp04',
      inputJson: {
        tipoPermiso: 'MEDICO',
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-01',
      },
    });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.crearOActualizar).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ usuarioSolicitante: 'emp04', usuarioCreacion: 'MOTOR_WORKFLOW' }),
      fakeTx,
    );
  });

  it('propaga el error de dominio sin envolverlo', async () => {
    solicitudService.crearOActualizar.mockRejectedValue(
      new BadRequestException('fechaFin debe ser igual o posterior a fechaInicio'),
    );
    const ctx = makeCtx({
      inputJson: {
        tipoPermiso: 'PERSONAL',
        fechaInicio: '2026-10-05',
        fechaFin: '2026-10-01',
      },
    });

    await expect(handler.execute(ctx, fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('AprobarPermisoHandler', () => {
  let handler: AprobarPermisoHandler;
  let solicitudService: jest.Mocked<SolicitudPermisosService>;

  beforeEach(() => {
    solicitudService = { aprobar: jest.fn() } as any;
    handler = new AprobarPermisoHandler(solicitudService, mockRegistry);
  });

  it('llama aprobar con instanciaId y el usuario del contexto', async () => {
    solicitudService.aprobar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      cfase: 'PER_APROBACION_JEFE',
      caccion: 'APROBAR_PERMISO',
      usuario: 'jefe01',
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.aprobar).toHaveBeenCalledWith(30, 'jefe01', fakeTx);
    expect(result.mensaje).toContain('jefe01');
  });

  it('propaga BadRequestException si la solicitud no está en PENDIENTE', async () => {
    solicitudService.aprobar.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'APROBADA'. Se esperaba 'PENDIENTE'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });
});

describe('RechazarPermisoHandler', () => {
  let handler: RechazarPermisoHandler;
  let solicitudService: jest.Mocked<SolicitudPermisosService>;

  beforeEach(() => {
    solicitudService = { rechazar: jest.fn() } as any;
    handler = new RechazarPermisoHandler(solicitudService, mockRegistry);
  });

  it('llama rechazar con el motivo del inputJson', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({
      cfase: 'PER_APROBACION_JEFE',
      caccion: 'RECHAZAR_PERMISO',
      usuario: 'jefe01',
      inputJson: { motivo: 'Carga de trabajo elevada' },
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(30, 'jefe01', 'Carga de trabajo elevada', fakeTx);
    expect(result.mensaje).toContain('jefe01');
  });

  it('llama rechazar con motivo null cuando inputJson no tiene motivo', async () => {
    solicitudService.rechazar.mockResolvedValue({} as any);
    const ctx = makeCtx({ inputJson: null });

    await handler.execute(ctx, fakeTx);

    expect(solicitudService.rechazar).toHaveBeenCalledWith(30, expect.any(String), null, fakeTx);
  });
});

describe('FinalizarPermisoHandler', () => {
  let handler: FinalizarPermisoHandler;
  let solicitudService: jest.Mocked<SolicitudPermisosService>;

  beforeEach(() => {
    solicitudService = { finalizar: jest.fn() } as any;
    handler = new FinalizarPermisoHandler(solicitudService, mockRegistry);
  });

  it('llama finalizar y retorna mensaje de confirmación', async () => {
    solicitudService.finalizar.mockResolvedValue(undefined as any);
    const ctx = makeCtx({
      cfase: 'PER_FINALIZACION',
      caccion: 'FINALIZAR_PERMISO',
      usuario: 'MOTOR_WORKFLOW',
    });

    const result = await handler.execute(ctx, fakeTx);

    expect(solicitudService.finalizar).toHaveBeenCalledWith(30, fakeTx);
    expect(result.mensaje).toContain('finalizado');
  });

  it('propaga BadRequestException si la solicitud no está en APROBADA', async () => {
    solicitudService.finalizar.mockRejectedValue(
      new BadRequestException(`La solicitud está en estado 'PENDIENTE'. Se esperaba 'APROBADA'.`),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(BadRequestException);
  });

  it('propaga NotFoundException si no existe la solicitud', async () => {
    solicitudService.finalizar.mockRejectedValue(
      new NotFoundException('No existe solicitud de permiso para la instancia 30'),
    );

    await expect(handler.execute(makeCtx(), fakeTx)).rejects.toThrow(NotFoundException);
  });
});
