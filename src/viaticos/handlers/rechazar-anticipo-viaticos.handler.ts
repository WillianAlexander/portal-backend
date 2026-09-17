import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudViaticosService } from '../domain/solicitud-viaticos.service';

@Injectable()
export class RechazarAnticipoViaticosHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'RECHAZAR_ANTICIPO_VIA';

  constructor(
    private readonly solicitudService: SolicitudViaticosService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const input = context.inputJson as { motivo?: string } | null;
    const motivo = input?.motivo ?? null;

    await this.solicitudService.rechazar(context.instanciaId, context.usuario, motivo, tx);
    return { mensaje: `Anticipo de viáticos rechazado por ${context.usuario}` };
  }
}
