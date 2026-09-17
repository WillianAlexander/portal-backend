import { ActionContext } from '../types/action-context.type';

export interface IResponsibleResolver {
  readonly codigoResolver: string;
  resolve(context: ActionContext): Promise<string[]>;
}
