import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAsignacion,
  EstadoEjecucion,
  EstadoInstancia,
  Prisma,
  TipoEjecucion,
  Tprocesoinstancia,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionHandlerRegistry } from '../handlers/action-handler.registry';
import { WorkflowPhaseService } from '../services/workflow-phase.service';
import { NotificacionService } from '../../notificaciones/notificacion.service';
import { StartInstancePayload } from '../dto/start-instance.dto';
import { ExecuteActionPayload } from '../dto/execute-action.dto';
import { ActionContext } from '../types/action-context.type';

const MOTOR_WORKFLOW = 'MOTOR_WORKFLOW';

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phaseService: WorkflowPhaseService,
    private readonly handlerRegistry: ActionHandlerRegistry,
    private readonly notificacionService: NotificacionService,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // Iniciar instancia
  // ──────────────────────────────────────────────────────────────

  async startInstance(dto: StartInstancePayload): Promise<Tprocesoinstancia> {
    const flujo = await this.prisma.tflujo.findUnique({ where: { cflujo: dto.cflujo } });
    if (!flujo) throw new NotFoundException(`Flujo '${dto.cflujo}' no encontrado`);
    if (flujo.estado !== 'ACTIVO') {
      throw new BadRequestException(`Flujo '${dto.cflujo}' no está ACTIVO`);
    }

    const primeraFase = await this.prisma.tflujofases.findFirst({
      where: { cflujo: dto.cflujo, estado: 'ACTIVO' },
      orderBy: { orden: 'asc' },
    });
    if (!primeraFase) {
      throw new BadRequestException(`El flujo '${dto.cflujo}' no tiene fases ACTIVO configuradas`);
    }

    const instancia = await this.prisma.$transaction(async (tx) => {
      const inst = await tx.tprocesoinstancia.create({
        data: {
          cflujo: dto.cflujo,
          cmodulo: flujo.cmodulo,
          cproceso: flujo.cproceso,
          cfaseActual: primeraFase.cfase,
          estado: EstadoInstancia.EN_PROCESO,
          tipoEntidad: dto.tipoEntidad ?? null,
          idEntidad: dto.idEntidad ?? null,
          usuarioSolicitante: dto.usuarioSolicitante,
          version: 0,
        },
      });

      await tx.tprocesoinstanciahistorial.create({
        data: {
          idInstancia: inst.id,
          faseOrigen: null,
          faseDestino: primeraFase.cfase,
          estadoOrigen: null,
          estadoDestino: EstadoInstancia.EN_PROCESO,
          usuario: dto.usuarioSolicitante,
          observacion: 'Instancia iniciada',
        },
      });

      await this.enterPhase(inst, primeraFase.cfase, tx);
      return inst;
    });

    return (await this.prisma.tprocesoinstancia.findUnique({
      where: { id: instancia.id },
    })) as Tprocesoinstancia;
  }

  // ──────────────────────────────────────────────────────────────
  // Ejecutar acción MANUAL
  // ──────────────────────────────────────────────────────────────

  async executeAction(
    instanciaId: number,
    caccion: string,
    dto: ExecuteActionPayload,
  ): Promise<Tprocesoinstancia> {
    const instancia = await this.prisma.tprocesoinstancia.findUnique({
      where: { id: instanciaId },
    });
    if (!instancia) throw new NotFoundException(`Instancia ${instanciaId} no encontrada`);
    if (instancia.estado !== EstadoInstancia.EN_PROCESO) {
      throw new BadRequestException(
        `La instancia está en estado '${instancia.estado}' y no acepta ejecución de acciones`,
      );
    }

    const faseAccion = await this.prisma.tfaseaccion.findUnique({
      where: { cfase_caccion: { cfase: instancia.cfaseActual, caccion } },
      include: { accion: true },
    });
    if (!faseAccion) {
      throw new BadRequestException(
        `Acción '${caccion}' no está configurada en la fase actual '${instancia.cfaseActual}'`,
      );
    }
    if (faseAccion.estado !== 'ACTIVO') {
      throw new BadRequestException(
        `La acción '${caccion}' no está ACTIVO en la fase '${instancia.cfaseActual}'`,
      );
    }
    if (faseAccion.accion.tipoEjecucion === TipoEjecucion.AUTOMATICA) {
      throw new BadRequestException(
        `La acción '${caccion}' es AUTOMATICA y es ejecutada directamente por el motor`,
      );
    }

    const asignacion = await this.prisma.tprocesoinstanciaresponsable.findFirst({
      where: {
        idInstancia: instanciaId,
        cfase: instancia.cfaseActual,
        caccion,
        cindividuo: dto.usuario,
        estado: EstadoAsignacion.PENDIENTE,
      },
    });
    if (!asignacion) {
      throw new BadRequestException(
        `Usuario '${dto.usuario}' no tiene asignación PENDIENTE para '${caccion}' en fase '${instancia.cfaseActual}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ejecucion = await tx.taccionejecucion.create({
        data: {
          idInstancia: instanciaId,
          cflujo: instancia.cflujo,
          cfase: instancia.cfaseActual,
          caccion,
          usuario: dto.usuario,
          estado: EstadoEjecucion.EN_PROCESO,
          inputJson:
            dto.inputJson !== undefined
              ? (dto.inputJson as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      const context: ActionContext = this.buildContext(
        instancia,
        instancia.cfaseActual,
        caccion,
        dto.usuario,
        dto.inputJson,
      );

      const handler = this.handlerRegistry.resolve(caccion);
      let outputJson: unknown = null;
      let mensaje: string | undefined;

      if (handler) {
        try {
          const result = await handler.execute(context, tx);
          outputJson = result.outputJson;
          mensaje = result.mensaje;
        } catch (err) {
          await tx.taccionejecucion.update({
            where: { id: ejecucion.id },
            data: {
              estado: EstadoEjecucion.FALLIDA,
              fechaFin: new Date(),
              error: err instanceof Error ? err.message : String(err),
            },
          });
          throw err;
        }
      } else {
        this.logger.warn(`Sin handler para '${caccion}'. Continuando sin lógica de negocio.`);
      }

      await tx.taccionejecucion.update({
        where: { id: ejecucion.id },
        data: {
          estado: EstadoEjecucion.EXITOSA,
          fechaFin: new Date(),
          mensaje: mensaje ?? null,
          outputJson:
            outputJson !== null && outputJson !== undefined
              ? (outputJson as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      // First-wins: ATENDIDA para el ejecutor, CANCELADA para las demás
      await tx.tprocesoinstanciaresponsable.updateMany({
        where: {
          idInstancia: instanciaId,
          cfase: instancia.cfaseActual,
          caccion,
          cindividuo: dto.usuario,
          estado: EstadoAsignacion.PENDIENTE,
        },
        data: { estado: EstadoAsignacion.ATENDIDA, fechaAtencion: new Date() },
      });
      await tx.tprocesoinstanciaresponsable.updateMany({
        where: {
          idInstancia: instanciaId,
          cfase: instancia.cfaseActual,
          caccion,
          estado: EstadoAsignacion.PENDIENTE,
        },
        data: { estado: EstadoAsignacion.CANCELADA },
      });

      return this.advanceWorkflow(instancia, faseAccion, dto.usuario, dto.comentario ?? null, tx);
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Entrar a una fase
  //
  // Orden de operaciones:
  //   1. Ejecutar acciones AUTOMATICA (sin avanzar workflow aún)
  //      - Si alguna es terminal → cerrar instancia y terminar
  //   2. Si hay acciones MANUAL → crear asignaciones y esperar
  //   3. Si solo había AUTOMATICA (sin terminal) → avanzar a siguiente fase
  // ──────────────────────────────────────────────────────────────

  private async enterPhase(
    instancia: Tprocesoinstancia,
    cfase: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const faseAcciones = await tx.tfaseaccion.findMany({
      where: { cfase, estado: 'ACTIVO' },
      include: { accion: true },
      orderBy: { orden: 'asc' },
    });

    const automaticas = faseAcciones.filter(
      (fa) => fa.accion.tipoEjecucion === TipoEjecucion.AUTOMATICA,
    );
    const manuales = faseAcciones.filter(
      (fa) => fa.accion.tipoEjecucion === TipoEjecucion.MANUAL,
    );

    // Step 1: Execute AUTOMATICA actions in order
    for (const fa of automaticas) {
      const context = this.buildContext(instancia, cfase, fa.caccion, MOTOR_WORKFLOW, null);
      await this.runAutomaticHandler(instancia, cfase, fa.caccion, context, tx);

      if (fa.esTerminal) {
        await this.advanceWorkflow(instancia, fa, MOTOR_WORKFLOW, null, tx);
        return;
      }
    }

    // Step 2: Create assignments for MANUAL actions
    if (manuales.length > 0) {
      for (const fa of manuales) {
        const context = this.buildContext(instancia, cfase, fa.caccion, MOTOR_WORKFLOW, null);
        await this.phaseService.resolveAndCreateAssignments(
          instancia.id,
          cfase,
          fa.caccion,
          context,
          tx,
        );
      }
      return;
    }

    // Step 3: All-AUTOMATICA phase (no MANUAL, none terminal) → advance to next phase
    if (automaticas.length > 0) {
      const lastAuto = automaticas[automaticas.length - 1];
      await this.advanceWorkflow(instancia, lastAuto, MOTOR_WORKFLOW, null, tx);
    } else {
      this.logger.warn(`Fase '${cfase}' no tiene acciones ACTIVO configuradas.`);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Ejecutar un handler AUTOMATICO (solo ejecución, sin avanzar)
  // ──────────────────────────────────────────────────────────────

  private async runAutomaticHandler(
    instancia: Tprocesoinstancia,
    cfase: string,
    caccion: string,
    context: ActionContext,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const ejecucion = await tx.taccionejecucion.create({
      data: {
        idInstancia: instancia.id,
        cflujo: instancia.cflujo,
        cfase,
        caccion,
        usuario: MOTOR_WORKFLOW,
        estado: EstadoEjecucion.EN_PROCESO,
        inputJson: Prisma.JsonNull,
      },
    });

    const handler = this.handlerRegistry.resolve(caccion);
    if (!handler) {
      this.logger.warn(`Sin handler para acción AUTOMATICA '${caccion}'. Marcando EXITOSA sin lógica.`);
      await tx.taccionejecucion.update({
        where: { id: ejecucion.id },
        data: {
          estado: EstadoEjecucion.EXITOSA,
          fechaFin: new Date(),
          mensaje: 'Sin handler registrado — ejecución automática omitida',
        },
      });
      return;
    }

    try {
      const result = await handler.execute(context, tx);
      await tx.taccionejecucion.update({
        where: { id: ejecucion.id },
        data: {
          estado: EstadoEjecucion.EXITOSA,
          fechaFin: new Date(),
          mensaje: result.mensaje ?? null,
          outputJson:
            result.outputJson !== null && result.outputJson !== undefined
              ? (result.outputJson as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });
    } catch (err) {
      await tx.taccionejecucion.update({
        where: { id: ejecucion.id },
        data: {
          estado: EstadoEjecucion.FALLIDA,
          fechaFin: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Avanzar workflow tras completar una acción
  // ──────────────────────────────────────────────────────────────

  private async advanceWorkflow(
    instancia: Tprocesoinstancia,
    faseAccion: {
      cfase: string;
      caccion: string;
      esTerminal: boolean;
      estadoFinalInstancia: EstadoInstancia | null;
    },
    usuario: string,
    observacion: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<Tprocesoinstancia> {
    if (faseAccion.esTerminal) {
      const estadoFinal = faseAccion.estadoFinalInstancia!;

      const result = await tx.tprocesoinstancia.updateMany({
        where: { id: instancia.id, version: instancia.version },
        data: {
          estado: estadoFinal,
          cfaseActual: faseAccion.cfase,
          fechaFin: new Date(),
          fechaModificacion: new Date(),
          version: instancia.version + 1,
        },
      });
      if (result.count === 0) {
        throw new ConflictException(
          'La instancia fue modificada concurrentemente. Reintente la operación.',
        );
      }

      await tx.tprocesoinstanciahistorial.create({
        data: {
          idInstancia: instancia.id,
          faseOrigen: instancia.cfaseActual,
          faseDestino: faseAccion.cfase,
          estadoOrigen: instancia.estado,
          estadoDestino: estadoFinal,
          usuario,
          observacion: observacion ?? `Instancia finalizada: ${estadoFinal}`,
        },
      });

      await this.notificacionService.notificarSolicitante(
        instancia.id,
        faseAccion.caccion,
        instancia.usuarioSolicitante,
        `Proceso ${estadoFinal}`,
        `Su solicitud de ${instancia.cproceso} ha finalizado con estado: ${estadoFinal}.`,
        tx,
      );

      return tx.tprocesoinstancia.findUniqueOrThrow({ where: { id: instancia.id } });
    }

    // No terminal: determinar siguiente fase
    const ordenActual = await this.getPhaseOrder(instancia.cflujo, instancia.cfaseActual, tx);
    const siguienteFase = await tx.tflujofases.findFirst({
      where: {
        cflujo: instancia.cflujo,
        estado: 'ACTIVO',
        orden: { gt: ordenActual },
      },
      orderBy: { orden: 'asc' },
    });

    if (!siguienteFase) {
      throw new InternalServerErrorException(
        `La acción '${faseAccion.caccion}' en fase '${faseAccion.cfase}' no es terminal pero no existe siguiente fase en el flujo '${instancia.cflujo}'`,
      );
    }

    const result = await tx.tprocesoinstancia.updateMany({
      where: { id: instancia.id, version: instancia.version },
      data: {
        cfaseActual: siguienteFase.cfase,
        fechaModificacion: new Date(),
        version: instancia.version + 1,
      },
    });
    if (result.count === 0) {
      throw new ConflictException(
        'La instancia fue modificada concurrentemente. Reintente la operación.',
      );
    }

    await tx.tprocesoinstanciahistorial.create({
      data: {
        idInstancia: instancia.id,
        faseOrigen: instancia.cfaseActual,
        faseDestino: siguienteFase.cfase,
        estadoOrigen: instancia.estado,
        estadoDestino: instancia.estado,
        usuario,
        observacion,
      },
    });

    const instanciaActualizada = await tx.tprocesoinstancia.findUniqueOrThrow({
      where: { id: instancia.id },
    });

    await this.enterPhase(instanciaActualizada, siguienteFase.cfase, tx);
    return instanciaActualizada;
  }

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────

  private buildContext(
    instancia: Tprocesoinstancia,
    cfase: string,
    caccion: string,
    usuario: string,
    inputJson: unknown = null,
  ): ActionContext {
    return {
      instanciaId: instancia.id,
      cflujo: instancia.cflujo,
      cmodulo: instancia.cmodulo,
      cproceso: instancia.cproceso,
      cfase,
      caccion,
      usuario,
      usuarioSolicitante: instancia.usuarioSolicitante,
      tipoEntidad: instancia.tipoEntidad,
      idEntidad: instancia.idEntidad,
      inputJson,
    };
  }

  private async getPhaseOrder(
    cflujo: string,
    cfase: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const rel = await tx.tflujofases.findUnique({
      where: { cflujo_cfase: { cflujo, cfase } },
    });
    if (!rel) {
      throw new InternalServerErrorException(`Fase '${cfase}' no está en el flujo '${cflujo}'`);
    }
    return rel.orden;
  }
}
