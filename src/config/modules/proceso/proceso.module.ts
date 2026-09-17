import { Module } from '@nestjs/common';
import { ProcesoController } from './proceso.controller';
import { ProcesoService } from './proceso.service';

@Module({
  controllers: [ProcesoController],
  providers: [ProcesoService],
  exports: [ProcesoService],
})
export class ProcesoModule {}
