import { Module } from '@nestjs/common';
import { ModuloModule } from './modules/modulo/modulo.module';
import { ProcesoModule } from './modules/proceso/proceso.module';
import { FlujoModule } from './modules/flujo/flujo.module';
import { FaseModule } from './modules/fase/fase.module';
import { AccionModule } from './modules/accion/accion.module';
import { OperacionModule } from './modules/operacion/operacion.module';

@Module({
  imports: [
    ModuloModule,
    ProcesoModule,
    FlujoModule,
    FaseModule,
    AccionModule,
    OperacionModule,
  ],
})
export class ConfigModule {}
