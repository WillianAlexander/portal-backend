import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFaseDto } from './dto/create-fase.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { QueryFaseDto } from './dto/query-fase.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class FaseService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateFaseDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tfases.create({
        data: {
          cfase: dto.cfase,
          detalle: dto.detalle,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(query: QueryFaseDto) {
    const { page = 1, limit = 20, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where = estado ? { estado } : {};

    const [items, total] = await Promise.all([
      this.prisma.tfases.findMany({ where, skip, take, orderBy: { cfase: 'asc' } }),
      this.prisma.tfases.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cfase: string) {
    const fase = await this.prisma.tfases.findUnique({ where: { cfase } });
    if (!fase) throw new NotFoundException(`Fase '${cfase}' no encontrada`);
    return fase;
  }

  async update(cfase: string, dto: UpdateFaseDto) {
    await this.findOne(cfase);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tfases.update({
        where: { cfase },
        data: {
          ...(dto.detalle !== undefined && { detalle: dto.detalle }),
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

  async updateEstado(cfase: string, dto: UpdateEstadoDto) {
    await this.findOne(cfase);
    try {
      return await this.prisma.tfases.update({
        where: { cfase },
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
