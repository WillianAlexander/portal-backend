import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoAsignacion, TipoResponsable } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAccionResponsableDto } from './dto/create-accion-responsable.dto';
import { UpdateAccionResponsableDto } from './dto/update-accion-responsable.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class AccionResponsableService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  private validateCoherencia(data: {
    tipoAsignacion: TipoAsignacion;
    ctipoResponsable: TipoResponsable;
    cgrupo?: string | null;
    crol?: string | null;
    cindividuo?: string | null;
    codigoResolver?: string | null;
  }): void {
    const { tipoAsignacion, ctipoResponsable, cgrupo, crol, cindividuo, codigoResolver } = data;

    if (tipoAsignacion === 'DINAMICO') {
      if (!codigoResolver) throw new BadRequestException('codigoResolver es requerido para tipoAsignacion=DINAMICO');
      if (cindividuo || cgrupo || crol) throw new BadRequestException('cindividuo, cgrupo y crol deben ser nulos para tipoAsignacion=DINAMICO');
    } else {
      // ESTATICO
      if (codigoResolver) throw new BadRequestException('codigoResolver debe ser nulo para tipoAsignacion=ESTATICO');
      if (ctipoResponsable === 'INDIVIDUO') {
        if (!cindividuo) throw new BadRequestException('cindividuo es requerido para ESTATICO+INDIVIDUO');
        if (cgrupo || crol) throw new BadRequestException('cgrupo y crol deben ser nulos para ESTATICO+INDIVIDUO');
      } else if (ctipoResponsable === 'GRUPO') {
        if (!cgrupo) throw new BadRequestException('cgrupo es requerido para ESTATICO+GRUPO');
        if (cindividuo || crol) throw new BadRequestException('cindividuo y crol deben ser nulos para ESTATICO+GRUPO');
      } else if (ctipoResponsable === 'ROL') {
        if (!crol) throw new BadRequestException('crol es requerido para ESTATICO+ROL');
        if (cindividuo || cgrupo) throw new BadRequestException('cindividuo y cgrupo deben ser nulos para ESTATICO+ROL');
      }
    }
  }

  async create(caccion: string, dto: CreateAccionResponsableDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    this.validateCoherencia({
      tipoAsignacion: dto.tipoAsignacion,
      ctipoResponsable: dto.ctipoResponsable,
      cgrupo: dto.cgrupo ?? null,
      crol: dto.crol ?? null,
      cindividuo: dto.cindividuo ?? null,
      codigoResolver: dto.codigoResolver ?? null,
    });

    const accion = await this.prisma.taccion.findUnique({ where: { caccion } });
    if (!accion) throw new NotFoundException(`Acción '${caccion}' no encontrada`);

    try {
      return await this.prisma.taccionresponsable.create({
        data: {
          caccion,
          ctipoResponsable: dto.ctipoResponsable,
          tipoAsignacion: dto.tipoAsignacion,
          cgrupo: dto.cgrupo ?? null,
          crol: dto.crol ?? null,
          cindividuo: dto.cindividuo ?? null,
          codigoResolver: dto.codigoResolver ?? null,
          prioridad: dto.prioridad ?? 0,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(caccion: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const accion = await this.prisma.taccion.findUnique({ where: { caccion } });
    if (!accion) throw new NotFoundException(`Acción '${caccion}' no encontrada`);

    const [items, total] = await Promise.all([
      this.prisma.taccionresponsable.findMany({
        where: { caccion },
        skip,
        take,
        orderBy: { prioridad: 'asc' },
      }),
      this.prisma.taccionresponsable.count({ where: { caccion } }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(caccion: string, id: number) {
    const registro = await this.prisma.taccionresponsable.findFirst({
      where: { id, caccion },
    });
    if (!registro) throw new NotFoundException(`Responsable con id ${id} para acción '${caccion}' no encontrado`);
    return registro;
  }

  async update(caccion: string, id: number, dto: UpdateAccionResponsableDto) {
    const current = await this.findOne(caccion, id);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);

    const merged = {
      tipoAsignacion: dto.tipoAsignacion ?? current.tipoAsignacion,
      ctipoResponsable: dto.ctipoResponsable ?? current.ctipoResponsable,
      cgrupo: 'cgrupo' in dto ? dto.cgrupo : current.cgrupo,
      crol: 'crol' in dto ? dto.crol : current.crol,
      cindividuo: 'cindividuo' in dto ? dto.cindividuo : current.cindividuo,
      codigoResolver: 'codigoResolver' in dto ? dto.codigoResolver : current.codigoResolver,
    };
    this.validateCoherencia(merged);

    try {
      return await this.prisma.taccionresponsable.update({
        where: { id },
        data: {
          ...(dto.ctipoResponsable !== undefined && { ctipoResponsable: dto.ctipoResponsable }),
          ...(dto.tipoAsignacion !== undefined && { tipoAsignacion: dto.tipoAsignacion }),
          ...('cgrupo' in dto && { cgrupo: dto.cgrupo }),
          ...('crol' in dto && { crol: dto.crol }),
          ...('cindividuo' in dto && { cindividuo: dto.cindividuo }),
          ...('codigoResolver' in dto && { codigoResolver: dto.codigoResolver }),
          ...(dto.prioridad !== undefined && { prioridad: dto.prioridad }),
          ...(dto.fechaInicio !== undefined && { fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null }),
          ...(dto.fechaFin !== undefined && { fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null }),
          usuarioModificacion: dto.usuarioModificacion,
          fechaModificacion: new Date(),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateEstado(caccion: string, id: number, dto: UpdateEstadoDto) {
    await this.findOne(caccion, id);
    try {
      return await this.prisma.taccionresponsable.update({
        where: { id },
        data: {
          estado: dto.estado,
          usuarioModificacion: dto.usuarioModificacion,
          fechaModificacion: new Date(),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
