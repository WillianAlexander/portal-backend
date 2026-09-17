import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ActionHandlerRegistry } from './handlers/action-handler.registry';
import { ResponsibleResolverRegistry } from './resolvers/responsible-resolver.registry';
import { WorkflowPhaseService } from './services/workflow-phase.service';
import { WorkflowEngine } from './engine/workflow.engine';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { WorkflowQueryService } from './services/workflow-query.service';
import { WorkflowController } from './controllers/workflow.controller';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [WorkflowController],
  providers: [
    ActionHandlerRegistry,
    ResponsibleResolverRegistry,
    WorkflowPhaseService,
    WorkflowEngine,
    WorkflowExecutionService,
    WorkflowQueryService,
  ],
  exports: [
    ActionHandlerRegistry,
    ResponsibleResolverRegistry,
    WorkflowExecutionService,
    WorkflowQueryService,
  ],
})
export class WorkflowModule {}
