import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProcesoDto } from './dto/create-proceso.dto';
import { UpdateProcesoDto } from './dto/update-proceso.dto';
import { QueryProcesoDto } from './dto/query-proceso.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class ProcesoService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateProcesoDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    const modulo = await this.prisma.tmodulo.findUnique({ where: { cmodulo: dto.cmodulo } });
    if (!modulo) throw new NotFoundException(`Módulo '${dto.cmodulo}' no encontrado`);
    try {
      return await this.prisma.tproceso.create({
        data: {
          cmodulo: dto.cmodulo,
          cproceso: dto.cproceso,
          descripcion: dto.descripcion,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(query: QueryProcesoDto) {
    const { page = 1, limit = 20, cmodulo, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where: Record<string, unknown> = {};
    if (cmodulo) where.cmodulo = cmodulo;
    if (estado) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.tproceso.findMany({ where, skip, take, orderBy: [{ cmodulo: 'asc' }, { cproceso: 'asc' }] }),
      this.prisma.tproceso.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cmodulo: string, cproceso: string) {
    const proceso = await this.prisma.tproceso.findUnique({
      where: { cmodulo_cproceso: { cmodulo, cproceso } },
    });
    if (!proceso) throw new NotFoundException(`Proceso '${cproceso}' en módulo '${cmodulo}' no encontrado`);
    return proceso;
  }

  async update(cmodulo: string, cproceso: string, dto: UpdateProcesoDto) {
    await this.findOne(cmodulo, cproceso);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tproceso.update({
        where: { cmodulo_cproceso: { cmodulo, cproceso } },
        data: {
          ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
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

  async updateEstado(cmodulo: string, cproceso: string, dto: UpdateEstadoDto) {
    await this.findOne(cmodulo, cproceso);
    try {
      return await this.prisma.tproceso.update({
        where: { cmodulo_cproceso: { cmodulo, cproceso } },
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
