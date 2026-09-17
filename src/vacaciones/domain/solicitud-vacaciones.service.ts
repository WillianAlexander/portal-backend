import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitudVacaciones, Prisma } from '@prisma/client';

export interface CrearSolicitudData {
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  usuarioCreacion: string;
  usuarioSolicitante: string;
}

@Injectable()
export class SolicitudVacacionesService {
  crearOActualizar(
    instanciaId: number,
    data: CrearSolicitudData,
    tx: Prisma.TransactionClient,
  ) {
    const fechaInicioVac = new Date(data.fechaInicio);
    const fechaFinVac = new Date(data.fechaFin);

    if (isNaN(fechaInicioVac.getTime()) || isNaN(fechaFinVac.getTime())) {
      throw new BadRequestException('fechaInicio y fechaFin deben ser fechas válidas (ISO 8601)');
    }
    if (fechaFinVac <= fechaInicioVac) {
      throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
    }
    if (data.dias <= 0) {
      throw new BadRequestException('dias debe ser mayor a cero');
    }

    return tx.tsolicitudvacaciones.upsert({
      where: { idInstanciaWorkflow: instanciaId },
      create: {
        idInstanciaWorkflow: instanciaId,
        usuarioSolicitante: data.usuarioSolicitante,
        fechaInicioVac,
        fechaFinVac,
        diasSolicitados: data.dias,
        estado: EstadoSolicitudVacaciones.PENDIENTE,
        usuarioCreacion: data.usuarioCreacion,
      },
      update: {
        fechaInicioVac,
        fechaFinVac,
        diasSolicitados: data.dias,
        usuarioModificacion: data.usuarioCreacion,
        fechaModificacion: new Date(),
      },
    });
  }

  async aprobar(instanciaId: number, usuarioAprobador: string, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudVacaciones.PENDIENTE, tx);
    return tx.tsolicitudvacaciones.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudVacaciones.APROBADA,
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
    await this.requireEstado(instanciaId, EstadoSolicitudVacaciones.PENDIENTE, tx);
    return tx.tsolicitudvacaciones.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudVacaciones.RECHAZADA,
        motivoRechazo: motivo,
        usuarioAprobador,
        fechaResolucion: new Date(),
        usuarioModificacion: usuarioAprobador,
        fechaModificacion: new Date(),
      },
    });
  }

  async generarCertificado(instanciaId: number, tx: Prisma.TransactionClient) {
    await this.requireEstado(instanciaId, EstadoSolicitudVacaciones.APROBADA, tx);
    const certificadoRef = `CERT-${instanciaId}-${Date.now()}`;
    await tx.tsolicitudvacaciones.update({
      where: { idInstanciaWorkflow: instanciaId },
      data: {
        estado: EstadoSolicitudVacaciones.CERTIFICADO_GENERADO,
        certificadoRef,
        fechaCertificado: new Date(),
        usuarioModificacion: 'MOTOR_WORKFLOW',
        fechaModificacion: new Date(),
      },
    });
    return certificadoRef;
  }

  private async requireEstado(
    instanciaId: number,
    estadoEsperado: EstadoSolicitudVacaciones,
    tx: Prisma.TransactionClient,
  ) {
    const solicitud = await tx.tsolicitudvacaciones.findUnique({
      where: { idInstanciaWorkflow: instanciaId },
    });
    if (!solicitud) {
      throw new NotFoundException(
        `No existe solicitud de vacaciones para la instancia ${instanciaId}`,
      );
    }
    if (solicitud.estado !== estadoEsperado) {
      throw new BadRequestException(
        `La solicitud está en estado '${solicitud.estado}'. Se esperaba '${estadoEsperado}'.`,
      );
    }
  }
}
