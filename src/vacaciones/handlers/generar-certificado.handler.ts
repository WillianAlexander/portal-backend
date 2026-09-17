import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IActionHandler } from '../../workflow/handlers/action-handler.interface';
import { ActionHandlerRegistry } from '../../workflow/handlers/action-handler.registry';
import { ActionContext } from '../../workflow/types/action-context.type';
import { ActionResult } from '../../workflow/types/action-result.type';
import { SolicitudVacacionesService } from '../domain/solicitud-vacaciones.service';

@Injectable()
export class GenerarCertificadoHandler implements IActionHandler, OnModuleInit {
  readonly caccion = 'GENERAR_CERTIFICADO';

  constructor(
    private readonly solicitudService: SolicitudVacacionesService,
    private readonly registry: ActionHandlerRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult> {
    const certificadoRef = await this.solicitudService.generarCertificado(context.instanciaId, tx);
    return { mensaje: `Certificado generado: ${certificadoRef}`, outputJson: { certificadoRef } };
  }
}
