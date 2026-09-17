import { Injectable, OnModuleInit } from '@nestjs/common';
import { IResponsibleResolver } from '../responsible-resolver.interface';
import { ResponsibleResolverRegistry } from '../responsible-resolver.registry';
import { ActionContext } from '../../types/action-context.type';
import { JefeEmpleadoService } from './jefe-empleado.service';

@Injectable()
export class JefeDelSolicitanteResolver implements IResponsibleResolver, OnModuleInit {
  readonly codigoResolver = 'JEFE_DEL_SOLICITANTE';

  constructor(
    private readonly jefeEmpleadoService: JefeEmpleadoService,
    private readonly registry: ResponsibleResolverRegistry,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async resolve(context: ActionContext): Promise<string[]> {
    const cjefe = await this.jefeEmpleadoService.obtenerJefe(context.usuarioSolicitante);
    return [cjefe];
  }
}
