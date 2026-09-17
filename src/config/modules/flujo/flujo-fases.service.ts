import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFlujoFasesDto } from './dto/create-flujo-fases.dto';
import { UpdateFlujoFasesDto } from './dto/update-flujo-fases.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class FlujoFasesService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(cflujo: string, dto: CreateFlujoFasesDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    const flujo = await this.prisma.tflujo.findUnique({ where: { cflujo } });
    if (!flujo) throw new NotFoundException(`Flujo '${cflujo}' no encontrado`);

    const fase = await this.prisma.tfases.findUnique({ where: { cfase: dto.cfase } });
    if (!fase) throw new NotFoundException(`Fase '${dto.cfase}' no encontrada`);

    try {
      return await this.prisma.tflujofases.create({
        data: {
          cflujo,
          cfase: dto.cfase,
          orden: dto.orden,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(cflujo: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const flujo = await this.prisma.tflujo.findUnique({ where: { cflujo } });
    if (!flujo) throw new NotFoundException(`Flujo '${cflujo}' no encontrado`);

    const [items, total] = await Promise.all([
      this.prisma.tflujofases.findMany({
        where: { cflujo },
        skip,
        take,
        orderBy: { orden: 'asc' },
      }),
      this.prisma.tflujofases.count({ where: { cflujo } }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cflujo: string, cfase: string) {
    const registro = await this.prisma.tflujofases.findUnique({
      where: { cflujo_cfase: { cflujo, cfase } },
    });
    if (!registro) throw new NotFoundException(`Relación flujo '${cflujo}' - fase '${cfase}' no encontrada`);
    return registro;
  }

  async update(cflujo: string, cfase: string, dto: UpdateFlujoFasesDto) {
    await this.findOne(cflujo, cfase);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tflujofases.update({
        where: { cflujo_cfase: { cflujo, cfase } },
        data: {
          ...(dto.orden !== undefined && { orden: dto.orden }),
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

  async updateEstado(cflujo: string, cfase: string, dto: UpdateEstadoDto) {
    await this.findOne(cflujo, cfase);
    try {
      return await this.prisma.tflujofases.update({
        where: { cflujo_cfase: { cflujo, cfase } },
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
