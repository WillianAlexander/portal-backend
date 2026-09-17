import { Injectable, Logger } from '@nestjs/common';
import { IResponsibleResolver } from './responsible-resolver.interface';

@Injectable()
export class ResponsibleResolverRegistry {
  private readonly logger = new Logger(ResponsibleResolverRegistry.name);
  private readonly map = new Map<string, IResponsibleResolver>();

  register(resolver: IResponsibleResolver): void {
    this.map.set(resolver.codigoResolver, resolver);
    this.logger.log(`Resolver registrado: ${resolver.codigoResolver}`);
  }

  resolve(codigoResolver: string): IResponsibleResolver | undefined {
    return this.map.get(codigoResolver);
  }

  has(codigoResolver: string): boolean {
    return this.map.has(codigoResolver);
  }
}
