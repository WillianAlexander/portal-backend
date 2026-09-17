import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitudViaticos, Prisma } from '@prisma/client';

export interface CrearSolicitudViaticosData {
  destino: string;
  fechaInicio: string;
  fechaFin: string;
  montoAnticipo: number;
  motivoViaje?: string;
  usuarioSolicitante: string;
  usuarioCreacion: string;
}

@Injectable()
export class SolicitudViaticosService {
  crearOActualizar(
    instanciaId: number,
    data: CrearSolicitudViaticosData,
    tx: Prisma.TransactionClient,
  ) {
    const fechaInicioViaje = new Date(data.fechaInicio);
    const fechaFinViaje = new Date(data.fechaFin);

    if (isNaN(fechaInicioViaje.getTime()) || isNaN(fechaFinViaje.getTime())) {
      throw new BadRequestException('fechaInicio y fechaFin deben ser fechas válidas (ISO 8601)');
    }
    if (fechaFinViaje < fechaInicioViaje) {
      throw new BadRequestException('fechaFin debe ser igual o posterior a fechaInicio');
    }
    if (data.montoAnticipo <= 0) {
      throw new BadRequestException('montoAnticipo debe ser mayor a cero');
    }

    return tx.tsolicitudviaticos.upsert({
      where: { idInstanciaWorkflow: instanciaId },
      create: {
        idInstanciaWorkflow: instanciaId,
        usuarioSolicitante: data.usuarioSolicitante,
        destino: data.destino,
        fechaInicioViaje,
        fechaFinViaje,
        motivoViaje: data.motivoViaje ?? null,
        montoAnticipo: data.montoAnticipo,
        estado: EstadoSolicitudViaticos.PENDIENTE,
        usuarioCreacion: data.usuarioCreacion,
      },
      update: {
        destino: data.destino,
        fechaInicioViaje,
        fechaFinViaje,
        motivoViaje: data.motivoViaje ?? null,
        montoAnticipo: data.montoAnticipo,
        usuarioModificacion: data.usuarioCreacion,
        fechaModificacion: new Date(),
      },
    });
  }

  async aprobar(instanciaId: number, usuarioAprobador: string, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudViaticos.PENDIENTE, tx);
    return tx.tsolicitudviaticos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudViaticos.APROBADA,
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
    await this.requireEstado(instanciaId, EstadoSolicitudViaticos.PENDIENTE, tx);
    return tx.tsolicitudviaticos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudViaticos.RECHAZADA,
        motivoRechazo: motivo,
        usuarioAprobador,
        fechaResolucion: new Date(),
        usuarioModificacion: usuarioAprobador,
        fechaModificacion: new Date(),
      },
    });
  }

  async generarOrdenPago(instanciaId: number, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudViaticos.APROBADA, tx);
    const ordenPagoRef = `OP-${instanciaId}-${Date.now()}`;
    await tx.tsolicitudviaticos.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudViaticos.ORDEN_GENERADA,
        ordenPagoRef,
        fechaOrdenPago: new Date(),
        usuarioModificacion: 'MOTOR_WORKFLOW',
        fechaModificacion: new Date(),
      },
    });
    return ordenPagoRef;
  }

  private async requireEstado(
    instanciaId: number,
    estadoEsperado: EstadoSolicitudViaticos,
    tx: Prisma.TransactionClient,
  ) {
    const solicitud = await tx.tsolicitudviaticos.findUnique({
      where: { idInstanciaWorkflow: instanciaId },
    });
    if (!solicitud) {
      throw new NotFoundException(
        `No existe solicitud de viáticos para la instancia ${instanciaId}`,
      );
    }
    if (solicitud.estado !== estadoEsperado) {
      throw new BadRequestException(
        `La solicitud está en estado '${solicitud.estado}'. Se esperaba '${estadoEsperado}'.`,
      );
    }
  }
}
