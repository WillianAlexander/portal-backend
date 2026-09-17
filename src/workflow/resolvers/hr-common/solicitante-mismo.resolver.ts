import { Injectable, OnModuleInit } from '@nestjs/common';
import { IResponsibleResolver } from '../responsible-resolver.interface';
import { ResponsibleResolverRegistry } from '../responsible-resolver.registry';
import { ActionContext } from '../../types/action-context.type';

@Injectable()
export class SolicitanteMismoResolver implements IResponsibleResolver, OnModuleInit {
  readonly codigoResolver = 'SOLICITANTE_MISMO';

  constructor(private readonly registry: ResponsibleResolverRegistry) {}

  onModuleInit() { this.registry.register(this); }

  async resolve(context: ActionContext): Promise<string[]> {
    return [context.usuarioSolicitante];
  }
}
