import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';
import { QueryOperacionDto } from './dto/query-operacion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class OperacionService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateOperacionDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    if (dto.caccion) {
      const accion = await this.prisma.taccion.findUnique({ where: { caccion: dto.caccion } });
      if (!accion) throw new NotFoundException(`Acción '${dto.caccion}' no encontrada`);
    }
    try {
      return await this.prisma.toperacion.create({
        data: {
          coperacion: dto.coperacion,
          descripcion: dto.descripcion,
          tipo: dto.tipo,
          metodoHttp: dto.metodoHttp ?? null,
          ruta: dto.ruta ?? null,
          caccion: dto.caccion ?? null,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(query: QueryOperacionDto) {
    const { page = 1, limit = 20, tipo, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.toperacion.findMany({ where, skip, take, orderBy: { coperacion: 'asc' } }),
      this.prisma.toperacion.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(coperacion: string) {
    const operacion = await this.prisma.toperacion.findUnique({ where: { coperacion } });
    if (!operacion) throw new NotFoundException(`Operación '${coperacion}' no encontrada`);
    return operacion;
  }

  async update(coperacion: string, dto: UpdateOperacionDto) {
    await this.findOne(coperacion);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    if (dto.caccion) {
      const accion = await this.prisma.taccion.findUnique({ where: { caccion: dto.caccion } });
      if (!accion) throw new NotFoundException(`Acción '${dto.caccion}' no encontrada`);
    }
    try {
      return await this.prisma.toperacion.update({
        where: { coperacion },
        data: {
          ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
          ...(dto.tipo !== undefined && { tipo: dto.tipo }),
          ...(dto.metodoHttp !== undefined && { metodoHttp: dto.metodoHttp }),
          ...(dto.ruta !== undefined && { ruta: dto.ruta }),
          ...(dto.caccion !== undefined && { caccion: dto.caccion }),
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

  async updateEstado(coperacion: string, dto: UpdateEstadoDto) {
    await this.findOne(coperacion);
    try {
      return await this.prisma.toperacion.update({
        where: { coperacion },
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
