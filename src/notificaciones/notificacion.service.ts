import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoNotificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesQueryDto } from './dto/notificaciones-query.dto';
import { buildPagination, buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class NotificacionService {
  constructor(private readonly prisma: PrismaService) {}

  async notificarResponsables(
    instanciaId: number,
    cfase: string,
    caccion: string,
    cproceso: string,
    individuos: string[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (individuos.length === 0) return;

    await tx.tnotificacion.createMany({
      data: individuos.map((cindividuo) => ({
        idInstancia: instanciaId,
        caccion,
        cindividuo,
        titulo: `Tarea pendiente: ${caccion}`,
        mensaje: `Tiene una nueva tarea pendiente en el proceso ${cproceso}, fase ${cfase}: ${caccion}.`,
      })),
    });
  }

  async notificarSolicitante(
    instanciaId: number,
    caccion: string | null,
    cindividuo: string,
    titulo: string,
    mensaje: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.tnotificacion.create({
      data: { idInstancia: instanciaId, caccion, cindividuo, titulo, mensaje },
    });
  }

  async getMisNotificaciones(usuario: string, query: NotificacionesQueryDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const where = {
      cindividuo: usuario,
      ...(query.estado && { estado: query.estado }),
    };

    const [items, total] = await Promise.all([
      this.prisma.tnotificacion.findMany({
        where,
        skip,
        take,
        orderBy: { fechaCreacion: 'desc' },
      }),
      this.prisma.tnotificacion.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async marcarLeida(id: number, usuario: string): Promise<void> {
    const notif = await this.prisma.tnotificacion.findUnique({ where: { id } });

    if (!notif || notif.cindividuo !== usuario) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }

    if (notif.estado === EstadoNotificacion.LEIDA) return;

    await this.prisma.tnotificacion.update({
      where: { id },
      data: { estado: EstadoNotificacion.LEIDA, fechaLectura: new Date() },
    });
  }
}
