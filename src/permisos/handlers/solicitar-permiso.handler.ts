import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudPermisosService } from '../domain/solicitud-permisos.service';

@Injectable()
export class SolicitarPermisoHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'SOLICITAR_PERMISO';

  constructor(
    private readonly solicitudService: SolicitudPermisosService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const input = context.inputJson as {
      tipoPermiso: string;
      fechaInicio: string;
      fechaFin: string;
      motivoPermiso?: string;
    };

    await this.solicitudService.crearOActualizar(
      context.instanciaId,
      {
        tipoPermiso: input.tipoPermiso,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        motivoPermiso: input.motivoPermiso,
        usuarioSolicitante: context.usuarioSolicitante,
        usuarioCreacion: context.usuario,
      },
      tx,
    );

    return { mensaje: `Solicitud de permiso registrada para ${context.usuarioSolicitante}` };
  }
}
