import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFlujoDto } from './dto/create-flujo.dto';
import { UpdateFlujoDto } from './dto/update-flujo.dto';
import { QueryFlujoDto } from './dto/query-flujo.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';

@Injectable()
export class FlujoService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  async create(dto: CreateFlujoDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    const proceso = await this.prisma.tproceso.findUnique({
      where: { cmodulo_cproceso: { cmodulo: dto.cmodulo, cproceso: dto.cproceso } },
    });
    if (!proceso) throw new NotFoundException(`Proceso '${dto.cproceso}' en módulo '${dto.cmodulo}' no encontrado`);
    try {
      return await this.prisma.tflujo.create({
        data: {
          cflujo: dto.cflujo,
          cmodulo: dto.cmodulo,
          cproceso: dto.cproceso,
          descripcion: dto.descripcion,
          cgrupofirmante: dto.cgrupofirmante ?? null,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(query: QueryFlujoDto) {
    const { page = 1, limit = 20, cmodulo, cproceso, estado } = query;
    const { skip, take } = buildPagination(page, limit);
    const where: Record<string, unknown> = {};
    if (cmodulo) where.cmodulo = cmodulo;
    if (cproceso) where.cproceso = cproceso;
    if (estado) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.tflujo.findMany({ where, skip, take, orderBy: { cflujo: 'asc' } }),
      this.prisma.tflujo.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cflujo: string) {
    const flujo = await this.prisma.tflujo.findUnique({ where: { cflujo } });
    if (!flujo) throw new NotFoundException(`Flujo '${cflujo}' no encontrado`);
    return flujo;
  }

  async update(cflujo: string, dto: UpdateFlujoDto) {
    await this.findOne(cflujo);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    try {
      return await this.prisma.tflujo.update({
        where: { cflujo },
        data: {
          ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
          ...(dto.cgrupofirmante !== undefined && { cgrupofirmante: dto.cgrupofirmante }),
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

  async updateEstado(cflujo: string, dto: UpdateEstadoDto) {
    await this.findOne(cflujo);
    try {
      return await this.prisma.tflujo.update({
        where: { cflujo },
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
