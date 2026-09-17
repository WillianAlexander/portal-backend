import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudViaticosService } from '../domain/solicitud-viaticos.service';

@Injectable()
export class AprobarAnticipoViaticosHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'APROBAR_ANTICIPO_VIA';

  constructor(
    private readonly solicitudService: SolicitudViaticosService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    await this.solicitudService.aprobar(context.instanciaId, context.usuario, tx);
    return { mensaje: `Anticipo de viáticos aprobado por ${context.usuario}` };
  }
}
