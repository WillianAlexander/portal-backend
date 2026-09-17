import { Module } from '@nestjs/common';
import { HrCommonModule } from '../workflow/resolvers/hr-common/hr-common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { SolicitudPermisosService } from './domain/solicitud-permisos.service';
import { SolicitarPermisoHandler } from './handlers/solicitar-permiso.handler';
import { AprobarPermisoHandler } from './handlers/aprobar-permiso.handler';
import { RechazarPermisoHandler } from './handlers/rechazar-permiso.handler';
import { FinalizarPermisoHandler } from './handlers/finalizar-permiso.handler';

@Module({
  imports: [PrismaModule, WorkflowModule, HrCommonModule],
  providers: [
    SolicitudPermisosService,
    SolicitarPermisoHandler,
    AprobarPermisoHandler,
    RechazarPermisoHandler,
    FinalizarPermisoHandler,
  ],
  exports: [
    SolicitudPermisosService,
    SolicitarPermisoHandler,
    AprobarPermisoHandler,
    RechazarPermisoHandler,
    FinalizarPermisoHandler,
  ],
})
export class PermisosModule {}
