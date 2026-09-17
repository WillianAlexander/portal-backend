import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAccionDto } from './dto/create-accion.dto';
import { UpdateAccionDto } from './dto/update-accion.dto';
import { QueryAccionDto } from './dto/query-accion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class AccionService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateAccionDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.taccion.create({
        data: {
          caccion: dto.caccion,
          descripcion: dto.descripcion,
          tipoAccion: dto.tipoAccion,
          tipoEjecucion: dto.tipoEjecucion,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(query: QueryAccionDto) {
    const { page = 1, limit = 20, tipoAccion, tipoEjecucion, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where: Record<string, unknown> = {};
    if (tipoAccion) where.tipoAccion = tipoAccion;
    if (tipoEjecucion) where.tipoEjecucion = tipoEjecucion;
    if (estado) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.taccion.findMany({ where, skip, take, orderBy: { caccion: 'asc' } }),
      this.prisma.taccion.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(caccion: string) {
    const accion = await this.prisma.taccion.findUnique({ where: { caccion } });
    if (!accion) throw new NotFoundException(`Acción '${caccion}' no encontrada`);
    return accion;
  }

  async update(caccion: string, dto: UpdateAccionDto) {
    await this.findOne(caccion);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.taccion.update({
        where: { caccion },
        data: {
          ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
          ...(dto.tipoAccion !== undefined && { tipoAccion: dto.tipoAccion }),
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

  async updateEstado(caccion: string, dto: UpdateEstadoDto) {
    await this.findOne(caccion);
    try {
      return await this.prisma.taccion.update({
        where: { caccion },
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
