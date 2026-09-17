import { InternalServerErrorException } from '@nestjs/common';
import { JefeEmpleadoService } from './jefe-empleado.service';
import { JefeDelSolicitanteResolver } from './jefe-del-solicitante.resolver';
import { SolicitanteMismoResolver } from './solicitante-mismo.resolver';
import { ActionContext } from '../../types/action-context.type';

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    instanciaId: 10,
    cflujo: 'FLUJO_VAC',
    cmodulo: 'TALENTO_HUMANO',
    cproceso: 'VACACIONES',
    cfase: 'VAC_APROBACION_JEFE',
    caccion: 'APROBAR_VACACIONES',
    usuario: 'MOTOR_WORKFLOW',
    usuarioSolicitante: 'user01',
    tipoEntidad: null,
    idEntidad: null,
    inputJson: null,
    ...overrides,
  };
}

const mockRegistry = { register: jest.fn() } as any;

describe('JefeDelSolicitanteResolver', () => {
  let resolver: JefeDelSolicitanteResolver;
  let jefeService: jest.Mocked<JefeEmpleadoService>;

  beforeEach(() => {
    jefeService = { obtenerJefe: jest.fn() } as any;
    resolver = new JefeDelSolicitanteResolver(jefeService, mockRegistry);
  });

  it('tiene codigoResolver JEFE_DEL_SOLICITANTE', () => {
    expect(resolver.codigoResolver).toBe('JEFE_DEL_SOLICITANTE');
  });

  it('llama obtenerJefe con context.usuarioSolicitante y retorna [cjefe]', async () => {
    jefeService.obtenerJefe.mockResolvedValue('jefe01');
    const ctx = makeCtx({ usuarioSolicitante: 'user01' });

    const result = await resolver.resolve(ctx);

    expect(jefeService.obtenerJefe).toHaveBeenCalledWith('user01');
    expect(result).toEqual(['jefe01']);
  });

  it('propaga InternalServerErrorException cuando el solicitante no tiene jefe', async () => {
    jefeService.obtenerJefe.mockRejectedValue(
      new InternalServerErrorException(
        `No se encontró jefe para el empleado 'user99'. Verifique la tabla TJEFEEMPLEADO.`,
      ),
    );

    await expect(resolver.resolve(makeCtx({ usuarioSolicitante: 'user99' }))).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('retorna exactamente un elemento (el jefe directo)', async () => {
    jefeService.obtenerJefe.mockResolvedValue('jefe02');

    const result = await resolver.resolve(makeCtx({ usuarioSolicitante: 'user03' }));

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('jefe02');
  });
});

describe('SolicitanteMismoResolver', () => {
  let resolver: SolicitanteMismoResolver;

  beforeEach(() => {
    resolver = new SolicitanteMismoResolver(mockRegistry);
  });

  it('tiene codigoResolver SOLICITANTE_MISMO', () => {
    expect(resolver.codigoResolver).toBe('SOLICITANTE_MISMO');
  });

  it('retorna [context.usuarioSolicitante]', async () => {
    const result = await resolver.resolve(makeCtx({ usuarioSolicitante: 'user02' }));
    expect(result).toEqual(['user02']);
  });

  it('no llama a ningún servicio externo', async () => {
    const result = await resolver.resolve(makeCtx());
    expect(result).toHaveLength(1);
  });
});

// ── Prueba de registro ────────────────────────────────────────────────────────

describe('Registro de resolvers compartidos', () => {
  it('SOLICITANTE_MISMO llama registry.register() al inicializar', () => {
    const reg = { register: jest.fn() } as any;
    const resolver = new SolicitanteMismoResolver(reg);
    resolver.onModuleInit();
    expect(reg.register).toHaveBeenCalledWith(resolver);
    expect(reg.register.mock.calls[0][0].codigoResolver).toBe('SOLICITANTE_MISMO');
  });

  it('JEFE_DEL_SOLICITANTE llama registry.register() al inicializar', () => {
    const reg = { register: jest.fn() } as any;
    const jefeService = { obtenerJefe: jest.fn() } as any;
    const resolver = new JefeDelSolicitanteResolver(jefeService, reg);
    resolver.onModuleInit();
    expect(reg.register).toHaveBeenCalledWith(resolver);
    expect(reg.register.mock.calls[0][0].codigoResolver).toBe('JEFE_DEL_SOLICITANTE');
  });

  it('resolver VIATICOS reutiliza JEFE_DEL_SOLICITANTE — mismo código, diferente proceso', async () => {
    const jefeService = { obtenerJefe: jest.fn().mockResolvedValue('jefe02') } as any;
    const resolver = new JefeDelSolicitanteResolver(jefeService, mockRegistry);

    const ctxViaticos = makeCtx({
      cflujo: 'VIATICOS_ANTICIPO',
      cproceso: 'VIATICOS',
      cfase: 'VIA_APROBACION_JEFE',
      caccion: 'APROBAR_ANTICIPO_VIA',
      usuarioSolicitante: 'emp02',
    });

    const result = await resolver.resolve(ctxViaticos);

    expect(jefeService.obtenerJefe).toHaveBeenCalledWith('emp02');
    expect(result).toEqual(['jefe02']);
  });
});
