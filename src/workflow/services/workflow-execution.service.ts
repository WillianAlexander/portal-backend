import { Injectable } from '@nestjs/common';
import { Tprocesoinstancia } from '@prisma/client';
import { WorkflowEngine } from '../engine/workflow.engine';
import { StartInstancePayload } from '../dto/start-instance.dto';
import { ExecuteActionPayload } from '../dto/execute-action.dto';

@Injectable()
export class WorkflowExecutionService {
  constructor(private readonly engine: WorkflowEngine) {}

  iniciarInstancia(payload: StartInstancePayload): Promise<Tprocesoinstancia> {
    return this.engine.startInstance(payload);
  }

  ejecutarAccion(
    instanciaId: number,
    caccion: string,
    payload: ExecuteActionPayload,
  ): Promise<Tprocesoinstancia> {
    return this.engine.executeAction(instanciaId, caccion, payload);
  }
}
