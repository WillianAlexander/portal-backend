import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma, Taccionresponsable } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponsibleResolverRegistry } from '../resolvers/responsible-resolver.registry';
import { NotificacionService } from '../../notificaciones/notificacion.service';
import { ActionContext } from '../types/action-context.type';

@Injectable()
export class WorkflowPhaseService {
  private readonly logger = new Logger(WorkflowPhaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolverRegistry: ResponsibleResolverRegistry,
    private readonly notificacionService: NotificacionService,
  ) {}

  async resolveAndCreateAssignments(
    instanciaId: number,
    cfase: string,
    caccion: string,
    context: ActionContext,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const responsables = await tx.taccionresponsable.findMany({
      where: { caccion, estado: 'ACTIVO' },
      orderBy: { prioridad: 'asc' },
    });

    if (responsables.length === 0) {
      throw new InternalServerErrorException(
        `Acción MANUAL '${caccion}' en fase '${cfase}' no tiene responsables configurados en TACCIONRESPONSABLE. El workflow quedaría bloqueado.`,
      );
    }

    let totalAsignaciones = 0;
    const individuosAsignados = new Set<string>();

    for (const resp of responsables) {
      const individuos = await this.resolveIndividuals(resp, context);
      for (const cindividuo of individuos) {
        try {
          await tx.tprocesoinstanciaresponsable.create({
            data: { idInstancia: instanciaId, cfase, caccion, cindividuo },
          });
          totalAsignaciones++;
          individuosAsignados.add(cindividuo);
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            this.logger.warn(
              `Asignación duplicada omitida: instancia=${instanciaId} cfase=${cfase} caccion=${caccion} cindividuo=${cindividuo}`,
            );
            totalAsignaciones++;
            individuosAsignados.add(cindividuo);
          } else {
            throw err;
          }
        }
      }
    }

    if (totalAsignaciones === 0) {
      throw new InternalServerErrorException(
        `Acción MANUAL '${caccion}' en fase '${cfase}' no pudo resolver ningún responsable. ` +
          `Verifique la configuración de TACCIONRESPONSABLE y los resolvers registrados.`,
      );
    }

    await this.notificacionService.notificarResponsables(
      instanciaId,
      cfase,
      caccion,
      context.cproceso,
      [...individuosAsignados],
      tx,
    );
  }

  async resolveIndividuals(
    responsable: Pick<
      Taccionresponsable,
      'tipoAsignacion' | 'ctipoResponsable' | 'cindividuo' | 'cgrupo' | 'crol' | 'codigoResolver'
    >,
    context: ActionContext,
  ): Promise<string[]> {
    if (
      responsable.tipoAsignacion === 'ESTATICO' &&
      responsable.ctipoResponsable === 'INDIVIDUO'
    ) {
      return responsable.cindividuo ? [responsable.cindividuo] : [];
    }

    const resolverCode =
      responsable.codigoResolver ?? responsable.cgrupo ?? responsable.crol;

    if (!resolverCode) {
      this.logger.warn(
        `Responsable sin código resolver para acción '${context.caccion}'. Individuo omitido.`,
      );
      return [];
    }

    const resolver = this.resolverRegistry.resolve(resolverCode);
    if (!resolver) {
      this.logger.warn(
        `Sin resolver registrado para código '${resolverCode}' (acción '${context.caccion}'). Individuo omitido.`,
      );
      return [];
    }

    return resolver.resolve(context);
  }
}
