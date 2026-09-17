import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { NotificacionesQueryDto } from './dto/notificaciones-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionService: NotificacionService) {}

  @Get('mis-notificaciones')
  getMisNotificaciones(@CurrentUser() user: string, @Query() query: NotificacionesQueryDto) {
    return this.notificacionService.getMisNotificaciones(user, query);
  }

  @Patch(':id/leer')
  marcarLeida(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: string) {
    return this.notificacionService.marcarLeida(id, user);
  }
}
