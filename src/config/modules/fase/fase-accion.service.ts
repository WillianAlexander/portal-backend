import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoInstancia } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFaseAccionDto } from './dto/create-fase-accion.dto';
import { UpdateFaseAccionDto } from './dto/update-fase-accion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { handlePrismaError } from '../../../common/utils/prisma-error.util';
import { buildPagination, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class FaseAccionService {
  constructor(private readonly prisma: PrismaService) {}

  private validateVigencia(fechaInicio?: string | null, fechaFin?: string | null): void {
    if (fechaInicio && fechaFin) {
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
      }
    }
  }

  private validateEsTerminal(esTerminal: boolean, estadoFinalInstancia?: EstadoInstancia | null): void {
    const ESTADOS_TERMINALES: EstadoInstancia[] = ['COMPLETADO', 'RECHAZADO', 'CANCELADO'];
    if (esTerminal) {
      if (!estadoFinalInstancia) {
        throw new BadRequestException('estadoFinalInstancia es requerido cuando esTerminal=true');
      }
      if (!ESTADOS_TERMINALES.includes(estadoFinalInstancia)) {
        throw new BadRequestException('estadoFinalInstancia debe ser COMPLETADO, RECHAZADO o CANCELADO');
      }
    } else {
      if (estadoFinalInstancia != null) {
        throw new BadRequestException('estadoFinalInstancia debe ser null cuando esTerminal=false');
      }
    }
  }

  async create(cfase: string, dto: CreateFaseAccionDto) {
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);
    const esTerminal = dto.esTerminal ?? false;
    this.validateEsTerminal(esTerminal, dto.estadoFinalInstancia ?? null);

    const fase = await this.prisma.tfases.findUnique({ where: { cfase } });
    if (!fase) throw new NotFoundException(`Fase '${cfase}' no encontrada`);

    const accion = await this.prisma.taccion.findUnique({ where: { caccion: dto.caccion } });
    if (!accion) throw new NotFoundException(`Acción '${dto.caccion}' no encontrada`);

    try {
      return await this.prisma.tfaseaccion.create({
        data: {
          cfase,
          caccion: dto.caccion,
          orden: dto.orden,
          obligatorio: dto.obligatorio ?? false,
          esTerminal,
          estadoFinalInstancia: dto.estadoFinalInstancia ?? null,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          usuarioCreacion: dto.usuarioCreacion,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(cfase: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const { skip, take } = buildPagination(page, limit);

    const fase = await this.prisma.tfases.findUnique({ where: { cfase } });
    if (!fase) throw new NotFoundException(`Fase '${cfase}' no encontrada`);

    const [items, total] = await Promise.all([
      this.prisma.tfaseaccion.findMany({
        where: { cfase },
        skip,
        take,
        orderBy: { orden: 'asc' },
      }),
      this.prisma.tfaseaccion.count({ where: { cfase } }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(cfase: string, caccion: string) {
    const registro = await this.prisma.tfaseaccion.findUnique({
      where: { cfase_caccion: { cfase, caccion } },
    });
    if (!registro) throw new NotFoundException(`Relación fase '${cfase}' - acción '${caccion}' no encontrada`);
    return registro;
  }

  async update(cfase: string, caccion: string, dto: UpdateFaseAccionDto) {
    const current = await this.findOne(cfase, caccion);
    this.validateVigencia(dto.fechaInicio, dto.fechaFin);

    const esTerminalFinal = dto.esTerminal ?? current.esTerminal;
    const estadoFinal = dto.estadoFinalInstancia !== undefined ? dto.estadoFinalInstancia : current.estadoFinalInstancia;
    this.validateEsTerminal(esTerminalFinal, estadoFinal);

    try {
      return await this.prisma.tfaseaccion.update({
        where: { cfase_caccion: { cfase, caccion } },
        data: {
          ...(dto.orden !== undefined && { orden: dto.orden }),
          ...(dto.obligatorio !== undefined && { obligatorio: dto.obligatorio }),
          ...(dto.esTerminal !== undefined && { esTerminal: dto.esTerminal }),
          ...(dto.estadoFinalInstancia !== undefined && { estadoFinalInstancia: dto.estadoFinalInstancia }),
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

  async updateEstado(cfase: string, caccion: string, dto: UpdateEstadoDto) {
    await this.findOne(cfase, caccion);
    try {
      return await this.prisma.tfaseaccion.update({
        where: { cfase_caccion: { cfase, caccion } },
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
