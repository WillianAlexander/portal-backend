import { Module } from '@nestjs/common';
import { FlujoController } from './flujo.controller';
import { FlujoService } from './flujo.service';
import { FlujoFasesController } from './flujo-fases.controller';
import { FlujoFasesService } from './flujo-fases.service';

@Module({
  controllers: [FlujoController, FlujoFasesController],
  providers: [FlujoService, FlujoFasesService],
  exports: [FlujoService, FlujoFasesService],
})
export class FlujoModule {}
