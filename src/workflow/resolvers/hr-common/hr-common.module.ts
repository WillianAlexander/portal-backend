import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WorkflowModule } from '../../workflow.module';
import { JefeEmpleadoService } from './jefe-empleado.service';
import { JefeDelSolicitanteResolver } from './jefe-del-solicitante.resolver';
import { SolicitanteMismoResolver } from './solicitante-mismo.resolver';

@Module({
  imports: [PrismaModule, WorkflowModule],
  providers: [
    JefeEmpleadoService,
    JefeDelSolicitanteResolver,
    SolicitanteMismoResolver,
  ],
  exports: [JefeEmpleadoService],
})
export class HrCommonModule {}
