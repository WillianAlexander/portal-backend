import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudVacacionesService } from '../domain/solicitud-vacaciones.service';

@Injectable()
export class SolicitarVacacionesHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'SOLICITAR_VACACIONES';

  constructor(
    private readonly solicitudService: SolicitudVacacionesService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const input = context.inputJson as {
      fechaInicio: string;
      fechaFin: string;
      dias: number;
    };

    await this.solicitudService.crearOActualizar(
      context.instanciaId,
      {
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        dias: input.dias,
        usuarioCreacion: context.usuario,
        usuarioSolicitante: context.usuarioSolicitante,
      },
      tx,
    );

    return { mensaje: `Solicitud de vacaciones registrada para ${context.usuarioSolicitante}` };
  }
}
