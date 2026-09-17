import { Module } from '@nestjs/common';
import { OperacionController } from './operacion.controller';
import { OperacionService } from './operacion.service';

@Module({
  controllers: [OperacionController],
  providers: [OperacionService],
  exports: [OperacionService],
})
export class OperacionModule {}
