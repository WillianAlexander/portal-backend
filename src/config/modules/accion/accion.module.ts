import { Module } from '@nestjs/common';
import { AccionController } from './accion.controller';
import { AccionService } from './accion.service';
import { AccionResponsableController } from './accion-responsable.controller';
import { AccionResponsableService } from './accion-responsable.service';

@Module({
  controllers: [AccionController, AccionResponsableController],
  providers: [AccionService, AccionResponsableService],
  exports: [AccionService, AccionResponsableService],
})
export class AccionModule {}
