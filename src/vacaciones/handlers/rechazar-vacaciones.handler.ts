import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudVacacionesService } from '../domain/solicitud-vacaciones.service';

@Injectable()
export class RechazarVacacionesHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'RECHAZAR_VACACIONES';

  constructor(
    private readonly solicitudService: SolicitudVacacionesService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const input = context.inputJson as { motivo?: string } | null;
    const motivo = input?.motivo ?? null;

    await this.solicitudService.rechazar(context.instanciaId, context.usuario, motivo, tx);
    return { mensaje: `Vacaciones rechazadas por ${context.usuario}` };
  }
}
