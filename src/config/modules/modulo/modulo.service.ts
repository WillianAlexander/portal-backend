import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { QueryModuloDto } from './dto/query-modulo.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class ModuloService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateModuloDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tmodulo.create({
        data: {
          cmodulo: dto.cmodulo,
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

  async findAll(query: QueryModuloDto) {
    const { page = 1, limit = 20, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where = estado ? { estado } : {};

    const [items, total] = await Promise.all([
      this.prisma.tmodulo.findMany({ where, skip, take, orderBy: { cmodulo: 'asc' } }),
      this.prisma.tmodulo.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cmodulo: string) {
    const modulo = await this.prisma.tmodulo.findUnique({ where: { cmodulo } });
    if (!modulo) throw new NotFoundException(`Módulo '${cmodulo}' no encontrado`);
    return modulo;
  }

  async update(cmodulo: string, dto: UpdateModuloDto) {
    await this.findOne(cmodulo);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tmodulo.update({
        where: { cmodulo },
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

  async updateEstado(cmodulo: string, dto: UpdateEstadoDto) {
    await this.findOne(cmodulo);
    try {
      return await this.prisma.tmodulo.update({
        where: { cmodulo },
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
