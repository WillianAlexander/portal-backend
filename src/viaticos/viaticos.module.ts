import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { HrCommonModule } from '../workflow/resolvers/hr-common/hr-common.module';
import { SolicitudViaticosService } from './domain/solicitud-viaticos.service';
import { SolicitarAnticipoViaticosHandler } from './handlers/solicitar-anticipo-viaticos.handler';
import { AprobarAnticipoViaticosHandler } from './handlers/aprobar-anticipo-viaticos.handler';
import { RechazarAnticipoViaticosHandler } from './handlers/rechazar-anticipo-viaticos.handler';
import { GenerarOrdenPagoViaticosHandler } from './handlers/generar-orden-pago-viaticos.handler';

@Module({
  imports: [PrismaModule, WorkflowModule, HrCommonModule],
  providers: [
    SolicitudViaticosService,
    SolicitarAnticipoViaticosHandler,
    AprobarAnticipoViaticosHandler,
    RechazarAnticipoViaticosHandler,
    GenerarOrdenPagoViaticosHandler,
  ],
  exports: [
    SolicitudViaticosService,
    SolicitarAnticipoViaticosHandler,
    AprobarAnticipoViaticosHandler,
    RechazarAnticipoViaticosHandler,
    GenerarOrdenPagoViaticosHandler,
  ],
})
export class ViaticosModule {}
