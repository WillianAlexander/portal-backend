import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowQueryDto } from '../dto/workflow-query.dto';
import { BandejaQueryDto } from '../dto/bandeja-query.dto';
import { buildPagination, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class WorkflowQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstancia(id: number, cempleado: string, rol: RolUsuario) {
    const instancia = await this.prisma.tprocesoinstancia.findUnique({
      where: { id },
      include: {
        responsables: {
          orderBy: [{ cfase: 'asc' }, { caccion: 'asc' }, { fechaAsignacion: 'asc' }],
        },
        historial: { orderBy: { fecha: 'asc' } },
        ejecuciones: { orderBy: { fechaInicio: 'asc' } },
        solicitudVacaciones: true,
        solicitudViaticos: true,
        solicitudPermisos: true,
      },
    });
    if (!instancia) throw new NotFoundException(`Instancia ${id} no encontrada`);

    if (rol === 'ADMIN' || rol === 'RRHH') return instancia;

    if (rol === 'JEFE') {
      const puedeVer =
        instancia.usuarioSolicitante === cempleado ||
        instancia.responsables.some((r) => r.cindividuo === cempleado);
      if (!puedeVer) throw new ForbiddenException('No tiene acceso a esta instancia');
      return instancia;
    }

    // EMPLEADO
    if (instancia.usuarioSolicitante !== cempleado) {
      throw new ForbiddenException('No tiene acceso a esta instancia');
    }
    return instancia;
  }

  async listInstancias(query: WorkflowQueryDto, cempleado: string, rol: RolUsuario) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const visibilityWhere = buildVisibilityWhere(cempleado, rol);

    const filterWhere: Prisma.TprocesoinstanciaWhereInput = {
      ...(query.cmodulo && { cmodulo: query.cmodulo }),
      ...(query.cproceso && { cproceso: query.cproceso }),
      ...(query.cflujo && { cflujo: query.cflujo }),
      ...(query.estado && { estado: query.estado }),
      ...(query.usuarioSolicitante && { usuarioSolicitante: query.usuarioSolicitante }),
    };

    const where: Prisma.TprocesoinstanciaWhereInput =
      Object.keys(visibilityWhere).length > 0
        ? { AND: [visibilityWhere, filterWhere] }
        : filterWhere;

    const [items, total] = await Promise.all([
      this.prisma.tprocesoinstancia.findMany({
        where,
        skip,
        take,
        orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.tprocesoinstancia.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async getMisTareas(usuario: string, query: BandejaQueryDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const instanciaFilter = {
      ...(query.cmodulo && { cmodulo: query.cmodulo }),
      ...(query.cproceso && { cproceso: query.cproceso }),
      ...(query.cflujo && { cflujo: query.cflujo }),
      ...(query.estado && { estado: query.estado }),
    };

    const where = {
      cindividuo: usuario,
      estado: 'PENDIENTE' as const,
      ...(Object.keys(instanciaFilter).length > 0 && { instancia: instanciaFilter }),
    };

    const [items, total] = await Promise.all([
      this.prisma.tprocesoinstanciaresponsable.findMany({
        where,
        include: {
          instancia: {
            include: { solicitudVacaciones: true, solicitudViaticos: true, solicitudPermisos: true },
          },
        },
        orderBy: { fechaAsignacion: 'asc' },
        skip,
        take,
      }),
      this.prisma.tprocesoinstanciaresponsable.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async getMisProcesos(usuario: string, query: BandejaQueryDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const where = {
      usuarioSolicitante: usuario,
      ...(query.cmodulo && { cmodulo: query.cmodulo }),
      ...(query.cproceso && { cproceso: query.cproceso }),
      ...(query.cflujo && { cflujo: query.cflujo }),
      ...(query.estado && { estado: query.estado }),
    };

    const [items, total] = await Promise.all([
      this.prisma.tprocesoinstancia.findMany({
        where,
        include: { solicitudVacaciones: true, solicitudViaticos: true, solicitudPermisos: true },
        skip,
        take,
        orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.tprocesoinstancia.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }
}

function buildVisibilityWhere(
  cempleado: string,
  rol: RolUsuario,
): Prisma.TprocesoinstanciaWhereInput {
  if (rol === 'ADMIN' || rol === 'RRHH') return {};

  if (rol === 'JEFE') {
    return {
      OR: [
        { usuarioSolicitante: cempleado },
        { responsables: { some: { cindividuo: cempleado } } },
      ],
    };
  }

  // EMPLEADO
  return { usuarioSolicitante: cempleado };
}
