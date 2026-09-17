import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { HrCommonModule } from '../workflow/resolvers/hr-common/hr-common.module';
import { SolicitudVacacionesService } from './domain/solicitud-vacaciones.service';
import { SolicitarVacacionesHandler } from './handlers/solicitar-vacaciones.handler';
import { AprobarVacacionesHandler } from './handlers/aprobar-vacaciones.handler';
import { RechazarVacacionesHandler } from './handlers/rechazar-vacaciones.handler';
import { GenerarCertificadoHandler } from './handlers/generar-certificado.handler';

@Module({
  imports: [PrismaModule, WorkflowModule, HrCommonModule],
  providers: [
    SolicitudVacacionesService,
    SolicitarVacacionesHandler,
    AprobarVacacionesHandler,
    RechazarVacacionesHandler,
    GenerarCertificadoHandler,
  ],
  exports: [
    SolicitudVacacionesService,
    SolicitarVacacionesHandler,
    AprobarVacacionesHandler,
    RechazarVacacionesHandler,
    GenerarCertificadoHandler,
  ],
})
export class VacacionesModule {}
