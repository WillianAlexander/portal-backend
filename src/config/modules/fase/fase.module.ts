import { Module } from '@nestjs/common';
import { FaseController } from './fase.controller';
import { FaseService } from './fase.service';
import { FaseAccionController } from './fase-accion.controller';
import { FaseAccionService } from './fase-accion.service';

@Module({
  controllers: [FaseController, FaseAccionController],
  providers: [FaseService, FaseAccionService],
  exports: [FaseService, FaseAccionService],
})
export class FaseModule {}
