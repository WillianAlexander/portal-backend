import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudViaticosService } from '../domain/solicitud-viaticos.service';

@Injectable()
export class GenerarOrdenPagoViaticosHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'GENERAR_ORDEN_PAGO_VIA';

  constructor(
    private readonly solicitudService: SolicitudViaticosService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const ordenPagoRef = await this.solicitudService.generarOrdenPago(context.instanciaId, tx);
    return { mensaje: `Orden de pago generada: ${ordenPagoRef}`, outputJson: { ordenPagoRef } };
  }
}
