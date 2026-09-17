import { Prisma } from '@prisma/client';
import { ActionContext } from '../types/action-context.type';
import { ActionResult } from '../types/action-result.type';

export interface IActionHandler {
  readonly caccion: string;
  execute(context: ActionContext, tx: Prisma.TransactionClient): Promise<ActionResult>;
}
