import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudViaticosService } from '../domain/solicitud-viaticos.service';

@Injectable()
export class SolicitarAnticipoViaticosHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'SOLICITAR_ANTICIPO_VIA';

  constructor(
    private readonly solicitudService: SolicitudViaticosService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const input = context.inputJson as {
      destino: string;
      fechaInicio: string;
      fechaFin: string;
      montoAnticipo: number;
      motivoViaje?: string;
    };

    await this.solicitudService.crearOActualizar(
      context.instanciaId,
      {
        destino: input.destino,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        montoAnticipo: input.montoAnticipo,
        motivoViaje: input.motivoViaje,
        usuarioSolicitante: context.usuarioSolicitante,
        usuarioCreacion: context.usuario,
      },
      tx,
    );

    return { mensaje: `Solicitud de anticipo de viáticos registrada para ${context.usuarioSolicitante}` };
  }
}
