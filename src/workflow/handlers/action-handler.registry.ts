import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler } from './action-handler.interface';

@Injectable()
export class ActionHandlerRegistry {
  private readonly logger = new Logger(ActionHandlerRegistry.name);
  private readonly map = new Map<string, IActionHandler>();

  register(handler: IActionHandler): void {
    this.map.set(handler.caccion, handler);
    this.logger.log(`Handler registrado: ${handler.caccion}`);
  }

  resolve(caccion: string): IActionHandler | undefined {
    return this.map.get(caccion);
  }

  has(caccion: string): boolean {
    return this.map.has(caccion);
  }
}
