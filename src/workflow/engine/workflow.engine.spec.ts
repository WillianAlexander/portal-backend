import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAsignacion, EstadoEjecucion, EstadoInstancia, TipoEjecucion } from '@prisma/client';
import { WorkflowEngine } from './workflow.engine';
import { WorkflowPhaseService } from '../services/workflow-phase.service';
import { ActionHandlerRegistry } from '../handlers/action-handler.registry';

// ─────────────────────────────────────────────
// Factories de datos de prueba
// ─────────────────────────────────────────────

function makeInstancia(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    cflujo: 'FLUJO_VAC',
    cmodulo: 'TALENTO',
    cproceso: 'VACACIONES',
    cfaseActual: 'SOLICITUD',
    estado: EstadoInstancia.EN_PROCESO,
    usuarioSolicitante: 'user01',
    tipoEntidad: null,
    idEntidad: null,
    version: 0,
    fechaInicio: new Date(),
    fechaFin: null,
    fechaCreacion: new Date(),
    fechaModificacion: null,
    ...overrides,
  };
}

function makeFaseAccion(overrides: Partial<any> = {}): any {
  return {
    cfase: 'SOLICITUD',
    caccion: 'SOLICITAR',
    orden: 1,
    esTerminal: false,
    estadoFinalInstancia: null,
    estado: 'ACTIVO',
    accion: { tipoEjecucion: TipoEjecucion.MANUAL },
    ...overrides,
  };
}

function makeFlujofase(cfase: string, orden: number, cflujo = 'FLUJO_VAC'): any {
  return { cflujo, cfase, orden, estado: 'ACTIVO' };
}

// ─────────────────────────────────────────────
// Mock del cliente de transacción (tx)
// ─────────────────────────────────────────────

function makeMockTx() {
  return {
    tprocesoinstancia: {
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
    },
    tprocesoinstanciahistorial: { create: jest.fn().mockResolvedValue({}) },
    tfaseaccion: { findMany: jest.fn(), findUnique: jest.fn() },
    tflujofases: { findFirst: jest.fn(), findUnique: jest.fn() },
    tprocesoinstanciaresponsable: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    taccionejecucion: {
      create: jest.fn().mockResolvedValue({ id: 99 }),
      update: jest.fn().mockResolvedValue({}),
    },
    tnotificacion: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

// ─────────────────────────────────────────────
// Suite principal
// ─────────────────────────────────────────────

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let mockPrisma: any;
  let mockPhaseService: jest.Mocked<Pick<WorkflowPhaseService, 'resolveAndCreateAssignments' | 'resolveIndividuals'>>;
  let mockHandlerRegistry: jest.Mocked<Pick<ActionHandlerRegistry, 'resolve' | 'has'>>;
  let mockTx: ReturnType<typeof makeMockTx>;

  beforeEach(() => {
    mockTx = makeMockTx();

    mockPrisma = {
      tflujo: { findUnique: jest.fn() },
      tflujofases: { findFirst: jest.fn() },
      tprocesoinstancia: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      tfaseaccion: { findUnique: jest.fn() },
      tprocesoinstanciaresponsable: { findFirst: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(mockTx)),
    };

    mockPhaseService = {
      resolveAndCreateAssignments: jest.fn().mockResolvedValue(undefined),
      resolveIndividuals: jest.fn(),
    };

    mockHandlerRegistry = {
      resolve: jest.fn().mockReturnValue(undefined), // sin handler por defecto
      has: jest.fn().mockReturnValue(false),
    };

    const mockNotificacionService = {
      notificarResponsables: jest.fn().mockResolvedValue(undefined),
      notificarSolicitante: jest.fn().mockResolvedValue(undefined),
    };

    engine = new WorkflowEngine(
      mockPrisma,
      mockPhaseService as any,
      mockHandlerRegistry as any,
      mockNotificacionService as any,
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. startInstance
  // ═══════════════════════════════════════════════════════════════

  describe('startInstance', () => {
    it('lanza NotFoundException cuando el flujo no existe', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue(null);
      await expect(
        engine.startInstance({ cflujo: 'INEXISTENTE', usuarioSolicitante: 'u1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException cuando el flujo está INACTIVO', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'INACTIVO', cmodulo: 'M', cproceso: 'P' });
      await expect(
        engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException cuando el flujo no tiene fases configuradas', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(null);
      await expect(
        engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea instancia con EN_PROCESO y version=0', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'FLUJO_VAC', estado: 'ACTIVO', cmodulo: 'TALENTO', cproceso: 'VACACIONES' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('SOLICITUD', 1));

      const instanciaCreada = makeInstancia();
      mockTx.tprocesoinstancia.create.mockResolvedValue(instanciaCreada);
      mockTx.tfaseaccion.findMany.mockResolvedValue([makeFaseAccion()]); // MANUAL
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(instanciaCreada);

      await engine.startInstance({ cflujo: 'FLUJO_VAC', usuarioSolicitante: 'user01' });

      expect(mockTx.tprocesoinstancia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoInstancia.EN_PROCESO,
            version: 0,
            cfaseActual: 'SOLICITUD',
            usuarioSolicitante: 'user01',
          }),
        }),
      );
    });

    it('registra historial inicial con faseOrigen=null', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'FLUJO_VAC', estado: 'ACTIVO', cmodulo: 'TALENTO', cproceso: 'VACACIONES' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('SOLICITUD', 1));

      const inst = makeInstancia();
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany.mockResolvedValue([makeFaseAccion()]);
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'FLUJO_VAC', usuarioSolicitante: 'user01' });

      expect(mockTx.tprocesoinstanciahistorial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            faseOrigen: null,
            faseDestino: 'SOLICITUD',
            estadoOrigen: null,
            estadoDestino: EstadoInstancia.EN_PROCESO,
            usuario: 'user01',
          }),
        }),
      );
    });

    it('crea asignaciones para acciones MANUALES al entrar a la primera fase', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'FLUJO_VAC', estado: 'ACTIVO', cmodulo: 'TALENTO', cproceso: 'VACACIONES' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('SOLICITUD', 1));

      const inst = makeInstancia();
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany.mockResolvedValue([
        makeFaseAccion({ caccion: 'SOLICITAR', accion: { tipoEjecucion: TipoEjecucion.MANUAL } }),
      ]);
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'FLUJO_VAC', usuarioSolicitante: 'user01' });

      expect(mockPhaseService.resolveAndCreateAssignments).toHaveBeenCalledWith(
        1, // instanciaId
        'SOLICITUD',
        'SOLICITAR',
        expect.any(Object), // context
        mockTx,
      );
    });

    it('obtiene la primera fase según orden ASC', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'FLUJO_VAC', estado: 'ACTIVO', cmodulo: 'TALENTO', cproceso: 'VACACIONES' });
      // Simula que findFirst devuelve la fase con orden=1 (es la primera)
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('SOLICITUD', 1));

      const inst = makeInstancia();
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany.mockResolvedValue([makeFaseAccion()]);
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'FLUJO_VAC', usuarioSolicitante: 'user01' });

      expect(mockPrisma.tflujofases.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { orden: 'asc' } }),
      );
      expect(mockTx.tprocesoinstancia.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cfaseActual: 'SOLICITUD' }) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. executeAction — validaciones previas
  // ═══════════════════════════════════════════════════════════════

  describe('executeAction — validaciones de pre-condición', () => {
    it('lanza NotFoundException cuando la instancia no existe', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(null);
      await expect(
        engine.executeAction(99, 'SOLICITAR', { usuario: 'u1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException cuando la instancia no está EN_PROCESO', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(
        makeInstancia({ estado: EstadoInstancia.COMPLETADO }),
      );
      await expect(
        engine.executeAction(1, 'SOLICITAR', { usuario: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException cuando la acción no está en la fase actual', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(null);
      await expect(
        engine.executeAction(1, 'ACCION_INEXISTENTE', { usuario: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException cuando la acción es AUTOMATICA', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(
        makeFaseAccion({ accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA } }),
      );
      await expect(
        engine.executeAction(1, 'GENERAR_CERT', { usuario: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException cuando el usuario no tiene asignación PENDIENTE', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion());
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue(null);

      await expect(
        engine.executeAction(1, 'SOLICITAR', { usuario: 'sin_permiso' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3 & 4. Terminal + Avance de fase
  // ═══════════════════════════════════════════════════════════════

  function setupHappyPath(
    faseAccionOverrides: Partial<any> = {},
    nextPhase: any = makeFlujofase('APROBACION', 2),
  ) {
    mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
    mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion(faseAccionOverrides));
    mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({
      id: 1,
      cindividuo: 'user01',
      estado: EstadoAsignacion.PENDIENTE,
    });

    // getPhaseOrder: tflujofases.findUnique (tx)
    mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('SOLICITUD', 1));
    // Siguiente fase
    mockTx.tflujofases.findFirst.mockResolvedValue(nextPhase);
    // Instancia tras avance
    const instanciaAvanzada = makeInstancia({ cfaseActual: nextPhase?.cfase ?? 'SOLICITUD', version: 1 });
    mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(instanciaAvanzada);
    // enterPhase de la siguiente fase: sin acciones (para simplificar)
    mockTx.tfaseaccion.findMany.mockResolvedValue([]);
  }

  describe('executeAction — acción no terminal (avance de fase)', () => {
    it('actualiza cfaseActual a la siguiente fase', async () => {
      setupHappyPath({ esTerminal: false, estadoFinalInstancia: null });

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 1, version: 0 }),
          data: expect.objectContaining({ cfaseActual: 'APROBACION', version: 1 }),
        }),
      );
    });

    it('incrementa version en 1', async () => {
      setupHappyPath({ esTerminal: false });

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1 }),
        }),
      );
    });

    it('registra historial con la transición de fase', async () => {
      setupHappyPath({ esTerminal: false });

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstanciahistorial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            faseOrigen: 'SOLICITUD',
            faseDestino: 'APROBACION',
            estadoOrigen: EstadoInstancia.EN_PROCESO,
            estadoDestino: EstadoInstancia.EN_PROCESO,
          }),
        }),
      );
    });

    it('crea asignaciones en la siguiente fase si tiene acciones MANUALES', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion({ esTerminal: false }));
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('SOLICITUD', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('APROBACION', 2));
      const instAvanzada = makeInstancia({ cfaseActual: 'APROBACION', version: 1 });
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(instAvanzada);
      // Siguiente fase tiene una acción MANUAL
      mockTx.tfaseaccion.findMany.mockResolvedValue([
        makeFaseAccion({ cfase: 'APROBACION', caccion: 'APROBAR', accion: { tipoEjecucion: TipoEjecucion.MANUAL } }),
      ]);

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockPhaseService.resolveAndCreateAssignments).toHaveBeenCalledWith(
        1, 'APROBACION', 'APROBAR', expect.any(Object), mockTx,
      );
    });
  });

  describe('executeAction — acciones terminales', () => {
    function setupTerminal(estadoFinal: EstadoInstancia) {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(
        makeFaseAccion({ esTerminal: true, estadoFinalInstancia: estadoFinal }),
      );
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({
        id: 1, estado: EstadoAsignacion.PENDIENTE,
      });
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(
        makeInstancia({ estado: estadoFinal, version: 1, fechaFin: new Date() }),
      );
    }

    for (const estado of [EstadoInstancia.COMPLETADO, EstadoInstancia.RECHAZADO, EstadoInstancia.CANCELADO]) {
      it(`establece estado=${estado} en la instancia`, async () => {
        setupTerminal(estado);
        await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

        expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ estado }),
          }),
        );
      });
    }

    it('establece fechaFin al cerrar la instancia', async () => {
      setupTerminal(EstadoInstancia.COMPLETADO);
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fechaFin: expect.any(Date) }),
        }),
      );
    });

    it('conserva cfaseActual al cerrar (nunca queda null)', async () => {
      setupTerminal(EstadoInstancia.RECHAZADO);
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cfaseActual: 'SOLICITUD' }),
        }),
      );
    });

    it('incrementa version al cerrar la instancia', async () => {
      setupTerminal(EstadoInstancia.COMPLETADO);
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ version: 0 }),
          data: expect.objectContaining({ version: 1 }),
        }),
      );
    });

    it('registra historial con el estado final correcto', async () => {
      setupTerminal(EstadoInstancia.RECHAZADO);
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstanciahistorial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estadoDestino: EstadoInstancia.RECHAZADO,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. First-wins
  // ═══════════════════════════════════════════════════════════════

  describe('first-wins: asignaciones al ejecutar', () => {
    it('marca la asignación del ejecutor como ATENDIDA', async () => {
      setupHappyPath();
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstanciaresponsable.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cindividuo: 'user01',
            estado: EstadoAsignacion.PENDIENTE,
          }),
          data: expect.objectContaining({ estado: EstadoAsignacion.ATENDIDA }),
        }),
      );
    });

    it('cancela las demás asignaciones PENDIENTE de la misma acción', async () => {
      setupHappyPath();
      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstanciaresponsable.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: EstadoAsignacion.PENDIENTE,
          }),
          data: expect.objectContaining({ estado: EstadoAsignacion.CANCELADA }),
        }),
      );
    });

    it('aplica ATENDIDA antes que CANCELADA (first-wins order)', async () => {
      setupHappyPath();
      const calls: any[] = [];
      mockTx.tprocesoinstanciaresponsable.updateMany.mockImplementation((args: any) => {
        calls.push(args.data.estado);
        return { count: 1 };
      });

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(calls[0]).toBe(EstadoAsignacion.ATENDIDA);
      expect(calls[1]).toBe(EstadoAsignacion.CANCELADA);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Optimistic locking
  // ═══════════════════════════════════════════════════════════════

  describe('optimistic locking', () => {
    it('lanza ConflictException cuando updateMany devuelve count=0 (avance)', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion({ esTerminal: false }));
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });
      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('SOLICITUD', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('APROBACION', 2));

      // Simula que otro proceso actualizó la instancia antes que nosotros
      mockTx.tprocesoinstancia.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException en cierre terminal cuando version ya cambió', async () => {
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(
        makeFaseAccion({ esTerminal: true, estadoFinalInstancia: EstadoInstancia.COMPLETADO }),
      );
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });
      mockTx.tprocesoinstancia.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' }),
      ).rejects.toThrow(ConflictException);
    });

    it('incluye la version actual en la condición WHERE del updateMany', async () => {
      setupHappyPath();
      const instanciaConVersion = makeInstancia({ version: 5 });
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(instanciaConVersion);
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion({ esTerminal: true, estadoFinalInstancia: EstadoInstancia.COMPLETADO }));
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(instanciaConVersion);

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ version: 5 }),
          data: expect.objectContaining({ version: 6 }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Atomicidad — handler que falla
  // ═══════════════════════════════════════════════════════════════

  describe('atomicidad — handler que falla', () => {
    it('actualiza TACCIONEJECUCION a FALLIDA cuando el handler lanza error', async () => {
      const handlerError = new Error('Error de negocio');
      const mockHandler = { caccion: 'SOLICITAR', execute: jest.fn().mockRejectedValue(handlerError) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion());
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });

      await expect(
        engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' }),
      ).rejects.toThrow('Error de negocio');

      expect(mockTx.taccionejecucion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: EstadoEjecucion.FALLIDA }),
        }),
      );
    });

    it('no avanza el workflow si el handler falla (rollback implícito)', async () => {
      const mockHandler = { caccion: 'SOLICITAR', execute: jest.fn().mockRejectedValue(new Error('falla')) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion());
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });

      await expect(engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' })).rejects.toThrow();

      // updateMany para avanzar NO debe haberse llamado
      expect(mockTx.tprocesoinstancia.updateMany).not.toHaveBeenCalled();
    });

    it('no crea historial si el handler falla', async () => {
      const mockHandler = { caccion: 'SOLICITAR', execute: jest.fn().mockRejectedValue(new Error('falla')) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(makeInstancia());
      mockPrisma.tfaseaccion.findUnique.mockResolvedValue(makeFaseAccion());
      mockPrisma.tprocesoinstanciaresponsable.findFirst.mockResolvedValue({ id: 1, estado: EstadoAsignacion.PENDIENTE });

      await expect(engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' })).rejects.toThrow();

      expect(mockTx.tprocesoinstanciahistorial.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Acciones AUTOMATICAS
  // ═══════════════════════════════════════════════════════════════

  describe('acciones AUTOMATICAS en enterPhase', () => {
    it('usa MOTOR_WORKFLOW como usuario en TACCIONEJECUCION', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      // Fase solo con AUTOMATICA no-terminal → avanza
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]); // siguiente fase vacía

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_MANUAL', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(makeInstancia({ cfaseActual: 'FASE_MANUAL', version: 1 }));
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      expect(mockTx.taccionejecucion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuario: 'MOTOR_WORKFLOW', caccion: 'AUTO_ACT' }),
        }),
      );
    });

    it('no llama a resolveAndCreateAssignments para acciones AUTOMATICAS', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]);

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE2', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(makeInstancia({ version: 1 }));
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      expect(mockPhaseService.resolveAndCreateAssignments).not.toHaveBeenCalled();
    });

    it('llama al handler registrado para acción AUTOMATICA', async () => {
      const mockHandler = { caccion: 'AUTO_ACT', execute: jest.fn().mockResolvedValue({ outputJson: null }) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]);

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE2', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(makeInstancia({ version: 1 }));
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      expect(mockHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({ usuario: 'MOTOR_WORKFLOW', caccion: 'AUTO_ACT' }),
        mockTx,
      );
    });

    it('avanza automáticamente después de una fase all-AUTOMATICA no terminal', async () => {
      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]); // fase siguiente vacía

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_MANUAL', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(
        makeInstancia({ cfaseActual: 'FASE_MANUAL', version: 1 }),
      );
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      // Debe haber llamado updateMany para avanzar la fase
      expect(mockTx.tprocesoinstancia.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cfaseActual: 'FASE_MANUAL' }),
        }),
      );
    });

    it('marca TACCIONEJECUCION EXITOSA incluso sin handler para AUTOMATICA', async () => {
      mockHandlerRegistry.resolve.mockReturnValue(undefined); // sin handler

      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]);

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE2', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(makeInstancia({ version: 1 }));
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      expect(mockTx.taccionejecucion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: EstadoEjecucion.EXITOSA }),
        }),
      );
    });

    it('marca TACCIONEJECUCION EXITOSA con outputJson cuando el handler AUTOMATICO tiene éxito', async () => {
      const mockHandler = {
        caccion: 'AUTO_ACT',
        execute: jest.fn().mockResolvedValue({ outputJson: { ref: 'CERT-1-abc' }, mensaje: 'Certificado generado' }),
      };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany
        .mockResolvedValueOnce([
          makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
        ])
        .mockResolvedValueOnce([]);

      mockTx.tflujofases.findUnique.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));
      mockTx.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE2', 2));
      mockTx.tprocesoinstancia.findUniqueOrThrow.mockResolvedValue(makeInstancia({ version: 1 }));
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' });

      expect(mockTx.taccionejecucion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoEjecucion.EXITOSA,
            mensaje: 'Certificado generado',
            outputJson: { ref: 'CERT-1-abc' },
          }),
        }),
      );
    });

    it('marca TACCIONEJECUCION FALLIDA y propaga el error cuando el handler AUTOMATICO lanza', async () => {
      const handlerError = new Error('Error generando certificado');
      const mockHandler = { caccion: 'AUTO_ACT', execute: jest.fn().mockRejectedValue(handlerError) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany.mockResolvedValueOnce([
        makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
      ]);
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await expect(
        engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' }),
      ).rejects.toThrow('Error generando certificado');

      expect(mockTx.taccionejecucion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoEjecucion.FALLIDA,
            error: 'Error generando certificado',
          }),
        }),
      );
    });

    it('NO avanza el workflow cuando el handler AUTOMATICO falla', async () => {
      const mockHandler = { caccion: 'AUTO_ACT', execute: jest.fn().mockRejectedValue(new Error('falla')) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);

      mockPrisma.tflujo.findUnique.mockResolvedValue({ cflujo: 'F1', estado: 'ACTIVO', cmodulo: 'M', cproceso: 'P' });
      mockPrisma.tflujofases.findFirst.mockResolvedValue(makeFlujofase('FASE_AUTO', 1));

      const inst = makeInstancia({ cfaseActual: 'FASE_AUTO' });
      mockTx.tprocesoinstancia.create.mockResolvedValue(inst);
      mockTx.tfaseaccion.findMany.mockResolvedValueOnce([
        makeFaseAccion({ cfase: 'FASE_AUTO', caccion: 'AUTO_ACT', accion: { tipoEjecucion: TipoEjecucion.AUTOMATICA }, esTerminal: false }),
      ]);
      mockPrisma.tprocesoinstancia.findUnique.mockResolvedValue(inst);

      await expect(
        engine.startInstance({ cflujo: 'F1', usuarioSolicitante: 'user01' }),
      ).rejects.toThrow();

      // updateMany para avanzar fase NO debe haberse llamado
      expect(mockTx.tprocesoinstancia.updateMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Registro de TACCIONEJECUCION en ejecución MANUAL
  // ═══════════════════════════════════════════════════════════════

  describe('registro de TACCIONEJECUCION para acciones MANUALES', () => {
    it('crea registro EN_PROCESO y luego actualiza a EXITOSA cuando el handler no falla', async () => {
      setupHappyPath();
      const updateCalls: string[] = [];
      mockTx.taccionejecucion.update.mockImplementation((args: any) => {
        updateCalls.push(args.data.estado);
        return Promise.resolve({});
      });

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01' });

      expect(mockTx.taccionejecucion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: EstadoEjecucion.EN_PROCESO, usuario: 'user01' }),
        }),
      );
      expect(updateCalls).toContain(EstadoEjecucion.EXITOSA);
    });

    it('pasa el handler el contexto con los datos de la instancia', async () => {
      const mockHandler = { caccion: 'SOLICITAR', execute: jest.fn().mockResolvedValue({}) };
      mockHandlerRegistry.resolve.mockReturnValue(mockHandler as any);
      setupHappyPath();

      await engine.executeAction(1, 'SOLICITAR', { usuario: 'user01', inputJson: { dias: 5 } });

      expect(mockHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          instanciaId: 1,
          cfase: 'SOLICITUD',
          caccion: 'SOLICITAR',
          usuario: 'user01',
          inputJson: { dias: 5 },
        }),
        mockTx,
      );
    });
  });
});
