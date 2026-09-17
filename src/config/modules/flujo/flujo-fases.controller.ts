import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { FlujoFasesService } from './flujo-fases.service';
import { CreateFlujoFasesDto } from './dto/create-flujo-fases.dto';
import { UpdateFlujoFasesDto } from './dto/update-flujo-fases.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Controller('config/flujos')
export class FlujoFasesController {
  constructor(private readonly flujoFasesService: FlujoFasesService) {}

  @Post(':cflujo/fases')
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Param('cflujo') cflujo: string, @Body() dto: CreateFlujoFasesDto) {
    return this.flujoFasesService.create(cflujo, dto);
  }

  @Get(':cflujo/fases')
  @Roles('ADMIN', 'RRHH')
  findAll(@Param('cflujo') cflujo: string, @Query() query: PaginationDto) {
    return this.flujoFasesService.findAll(cflujo, query);
  }

  @Patch(':cflujo/fases/:cfase')
  @Roles('ADMIN')
  update(
    @Param('cflujo') cflujo: string,
    @Param('cfase') cfase: string,
    @Body() dto: UpdateFlujoFasesDto,
  ) {
    return this.flujoFasesService.update(cflujo, cfase, dto);
  }

  @Patch(':cflujo/fases/:cfase/estado')
  @Roles('ADMIN')
  updateEstado(
    @Param('cflujo') cflujo: string,
    @Param('cfase') cfase: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.flujoFasesService.updateEstado(cflujo, cfase, dto);
  }
}
