import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitudPermiso, Prisma } from '@prisma/client';

export interface CrearSolicitudPermisoData {
  tipoPermiso: string;
  fechaInicio: string;
  fechaFin: string;
  motivoPermiso?: string;
  usuarioSolicitante: string;
  usuarioCreacion: string;
}

@Injectable()
export class SolicitudPermisosService {
  crearOActualizar(
    instanciaId: number,
    data: CrearSolicitudPermisoData,
    tx: Prisma.TransactionClient,
  ) {
    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      throw new BadRequestException('fechaInicio y fechaFin deben ser fechas válidas (ISO 8601)');
    }
    if (fechaFin < fechaInicio) {
      throw new BadRequestException('fechaFin debe ser igual o posterior a fechaInicio');
    }

    return tx.tsolicitudpermisos.upsert({
      where: { idInstanciaWorkflow: instanciaId },
      create: {
        idInstanciaWorkflow: instanciaId,
        usuarioSolicitante: data.usuarioSolicitante,
        tipoPermiso: data.tipoPermiso,
        fechaInicio,
        fechaFin,
        motivoPermiso: data.motivoPermiso ?? null,
        estado: EstadoSolicitudPermiso.PENDIENTE,
        usuarioCreacion: data.usuarioCreacion,
      },
      update: {
        tipoPermiso: data.tipoPermiso,
        fechaInicio,
        fechaFin,
        motivoPermiso: data.motivoPermiso ?? null,
        usuarioModificacion: data.usuarioCreacion,
        fechaModificacion: new Date(),
      },
    });
  }

  async aprobar(instanciaId: number, usuarioAprobador: string, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudPermiso.PENDIENTE, tx);
    return tx.tsolicitudpermisos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudPermiso.APROBADA,
        usuarioAprobador,
        fechaResolucion: new Date(),
        usuarioModificacion: usuarioAprobador,
        fechaModificacion: new Date(),
      },
    });
  }

  async rechazar(
    instanciaId: number,
    usuarioAprobador: string,
    motivo: string | null,
    tx: Prisma.TransactionClient,
  ) {
    await this.requireEstado(instanciaId, EstadoSolicitudPermiso.PENDIENTE, tx);
    return tx.tsolicitudpermisos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudPermiso.RECHAZADA,
        motivoRechazo: motivo,
        usuarioAprobador,
        fechaResolucion: new Date(),
        usuarioModificacion: usuarioAprobador,
        fechaModificacion: new Date(),
      },
    });
  }

  async finalizar(instanciaId: number, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudPermiso.APROBADA, tx);
    await tx.tsolicitudpermisos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudPermiso.FINALIZADA,
        usuarioModificacion: 'MOTOR_WORKFLOW',
        fechaModificacion: new Date(),
      },
    });
  }

  private async requireEstado(
    instanciaId: number,
    estadoEsperado: EstadoSolicitudPermiso,
    tx: Prisma.TransactionClient,
  ) {
    const solicitud = await tx.tsolicitudpermisos.findUnique({
      where: { idInstanciaWorkflow: instanciaId },
    });
    if (!solicitud) {
      throw new NotFoundException(
        `No existe solicitud de permiso para la instancia ${instanciaId}`,
      );
    }
    if (solicitud.estado !== estadoEsperado) {
      throw new BadRequestException(
        `La solicitud está en estado '${solicitud.estado}'. Se esperaba '${estadoEsperado}'.`,
      );
    }
  }
}
