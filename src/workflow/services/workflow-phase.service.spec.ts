import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkflowPhaseService } from './workflow-phase.service';
import { ResponsibleResolverRegistry } from '../resolvers/responsible-resolver.registry';
import { ActionContext } from '../types/action-context.type';

const mockCtx: ActionContext = {
  instanciaId: 1,
  cflujo: 'FLUJO_VAC',
  cmodulo: 'TALENTO',
  cproceso: 'VACACIONES',
  cfase: 'SOLICITUD',
  caccion: 'SOLICITAR',
  usuario: 'MOTOR_WORKFLOW',
  usuarioSolicitante: 'user01',
  tipoEntidad: null,
  idEntidad: null,
  inputJson: null,
};

function makeTx(overrides: Record<string, any> = {}) {
  return {
    taccionresponsable: { findMany: jest.fn() },
    tprocesoinstanciaresponsable: { create: jest.fn() },
    tnotificacion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ...overrides,
  };
}

describe('WorkflowPhaseService', () => {
  let service: WorkflowPhaseService;
  let resolverRegistry: jest.Mocked<ResponsibleResolverRegistry>;

  beforeEach(() => {
    resolverRegistry = {
      resolve: jest.fn(),
      has: jest.fn(),
      map: new Map(),
      logger: { log: jest.fn(), warn: jest.fn() } as any,
    } as any;

    const mockNotificacionService = {
      notificarResponsables: jest.fn().mockResolvedValue(undefined),
    };

    service = new WorkflowPhaseService(
      {} as any, // PrismaService not needed directly in these tests
      resolverRegistry,
      mockNotificacionService as any,
    );
  });

  // ─────────────────────────────────────────────
  // resolveIndividuals
  // ─────────────────────────────────────────────

  describe('resolveIndividuals', () => {
    it('returns cindividuo directly for ESTATICO + INDIVIDUO', async () => {
      const resp = {
        tipoAsignacion: 'ESTATICO' as const,
        ctipoResponsable: 'INDIVIDUO' as const,
        cindividuo: 'user42',
        cgrupo: null,
        crol: null,
        codigoResolver: null,
      };
      const result = await service.resolveIndividuals(resp, mockCtx);
      expect(result).toEqual(['user42']);
      expect(resolverRegistry.resolve).not.toHaveBeenCalled();
    });

    it('returns [] for ESTATICO + INDIVIDUO when cindividuo is null', async () => {
      const resp = {
        tipoAsignacion: 'ESTATICO' as const,
        ctipoResponsable: 'INDIVIDUO' as const,
        cindividuo: null,
        cgrupo: null,
        crol: null,
        codigoResolver: null,
      };
      const result = await service.resolveIndividuals(resp, mockCtx);
      expect(result).toEqual([]);
    });

    it('calls resolver for DINAMICO and returns resolved users', async () => {
      const mockResolver = { codigoResolver: 'JEFE_DEL_SOLICITANTE', resolve: jest.fn().mockResolvedValue(['jefe01', 'jefe02']) };
      resolverRegistry.resolve.mockReturnValue(mockResolver as any);

      const resp = {
        tipoAsignacion: 'DINAMICO' as const,
        ctipoResponsable: 'INDIVIDUO' as const,
        cindividuo: null,
        cgrupo: null,
        crol: null,
        codigoResolver: 'JEFE_DEL_SOLICITANTE',
      };
      const result = await service.resolveIndividuals(resp, mockCtx);
      expect(result).toEqual(['jefe01', 'jefe02']);
      expect(resolverRegistry.resolve).toHaveBeenCalledWith('JEFE_DEL_SOLICITANTE');
    });

    it('returns [] and logs warning when resolver not registered for DINAMICO', async () => {
      resolverRegistry.resolve.mockReturnValue(undefined);

      const resp = {
        tipoAsignacion: 'DINAMICO' as const,
        ctipoResponsable: 'INDIVIDUO' as const,
        cindividuo: null,
        cgrupo: null,
        crol: null,
        codigoResolver: 'SIN_RESOLVER',
      };
      const result = await service.resolveIndividuals(resp, mockCtx);
      expect(result).toEqual([]);
    });

    it('uses cgrupo as resolver code for ESTATICO + GRUPO', async () => {
      const mockResolver = { codigoResolver: 'GRP_RRHH', resolve: jest.fn().mockResolvedValue(['mgr01']) };
      resolverRegistry.resolve.mockReturnValue(mockResolver as any);

      const resp = {
        tipoAsignacion: 'ESTATICO' as const,
        ctipoResponsable: 'GRUPO' as const,
        cindividuo: null,
        cgrupo: 'GRP_RRHH',
        crol: null,
        codigoResolver: null,
      };
      const result = await service.resolveIndividuals(resp, mockCtx);
      expect(result).toEqual(['mgr01']);
      expect(resolverRegistry.resolve).toHaveBeenCalledWith('GRP_RRHH');
    });
  });

  // ─────────────────────────────────────────────
  // resolveAndCreateAssignments — hardening
  // ─────────────────────────────────────────────

  describe('resolveAndCreateAssignments', () => {
    it('throws InternalServerErrorException when no responsables configured', async () => {
      const tx = makeTx();
      (tx.taccionresponsable.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.resolveAndCreateAssignments(1, 'SOLICITUD', 'SOLICITAR', mockCtx, tx as any),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when all responsables resolve to empty', async () => {
      const tx = makeTx();
      (tx.taccionresponsable.findMany as jest.Mock).mockResolvedValue([
        {
          tipoAsignacion: 'DINAMICO',
          ctipoResponsable: 'INDIVIDUO',
          cindividuo: null,
          cgrupo: null,
          crol: null,
          codigoResolver: 'SIN_RESOLVER',
          estado: 'ACTIVO',
          prioridad: 0,
        },
      ]);
      resolverRegistry.resolve.mockReturnValue(undefined); // no resolver registered

      await expect(
        service.resolveAndCreateAssignments(1, 'SOLICITUD', 'SOLICITAR', mockCtx, tx as any),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('creates assignments for resolved individuals', async () => {
      const tx = makeTx();
      (tx.taccionresponsable.findMany as jest.Mock).mockResolvedValue([
        {
          tipoAsignacion: 'ESTATICO',
          ctipoResponsable: 'INDIVIDUO',
          cindividuo: 'user01',
          cgrupo: null,
          crol: null,
          codigoResolver: null,
          estado: 'ACTIVO',
          prioridad: 0,
        },
      ]);
      (tx.tprocesoinstanciaresponsable.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.resolveAndCreateAssignments(1, 'SOLICITUD', 'SOLICITAR', mockCtx, tx as any);

      expect(tx.tprocesoinstanciaresponsable.create).toHaveBeenCalledWith({
        data: {
          idInstancia: 1,
          cfase: 'SOLICITUD',
          caccion: 'SOLICITAR',
          cindividuo: 'user01',
        },
      });
    });

    it('handles P2002 duplicate gracefully and still counts as assigned', async () => {
      const tx = makeTx();
      (tx.taccionresponsable.findMany as jest.Mock).mockResolvedValue([
        {
          tipoAsignacion: 'ESTATICO',
          ctipoResponsable: 'INDIVIDUO',
          cindividuo: 'user01',
          cgrupo: null,
          crol: null,
          codigoResolver: null,
          estado: 'ACTIVO',
          prioridad: 0,
        },
      ]);

      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['idInstancia', 'cfase', 'caccion', 'cindividuo'] },
      });
      (tx.tprocesoinstanciaresponsable.create as jest.Mock).mockRejectedValue(p2002Error);

      // Should NOT throw — duplicate is OK
      await expect(
        service.resolveAndCreateAssignments(1, 'SOLICITUD', 'SOLICITAR', mockCtx, tx as any),
      ).resolves.toBeUndefined();
    });

    it('creates multiple assignments when multiple individuals are resolved', async () => {
      const mockResolver = {
        codigoResolver: 'JEFE_DEL_SOLICITANTE',
        resolve: jest.fn().mockResolvedValue(['mgr01', 'mgr02']),
      };
      resolverRegistry.resolve.mockReturnValue(mockResolver as any);

      const tx = makeTx();
      (tx.taccionresponsable.findMany as jest.Mock).mockResolvedValue([
        {
          tipoAsignacion: 'DINAMICO',
          ctipoResponsable: 'INDIVIDUO',
          cindividuo: null,
          cgrupo: null,
          crol: null,
          codigoResolver: 'JEFE_DEL_SOLICITANTE',
          estado: 'ACTIVO',
          prioridad: 0,
        },
      ]);
      (tx.tprocesoinstanciaresponsable.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.resolveAndCreateAssignments(1, 'SOLICITUD', 'SOLICITAR', mockCtx, tx as any);

      expect(tx.tprocesoinstanciaresponsable.create).toHaveBeenCalledTimes(2);
      expect(tx.tprocesoinstanciaresponsable.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cindividuo: 'mgr01' }) }),
      );
      expect(tx.tprocesoinstanciaresponsable.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cindividuo: 'mgr02' }) }),
      );
    });
  });
});
