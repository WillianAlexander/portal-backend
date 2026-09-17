import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionService } from './notificacion.service';
import { NotificacionesController } from './notificaciones.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotificacionesController],
  providers: [NotificacionService],
  exports: [NotificacionService],
})
export class NotificacionesModule {}
