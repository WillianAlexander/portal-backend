import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { FaseAccionService } from './fase-accion.service';
import { CreateFaseAccionDto } from './dto/create-fase-accion.dto';
import { UpdateFaseAccionDto } from './dto/update-fase-accion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Controller('config/fases')
export class FaseAccionController {
  constructor(private readonly faseAccionService: FaseAccionService) {}

  @Post(':cfase/acciones')
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Param('cfase') cfase: string, @Body() dto: CreateFaseAccionDto) {
    return this.faseAccionService.create(cfase, dto);
  }

  @Get(':cfase/acciones')
  @Roles('ADMIN', 'RRHH')
  findAll(@Param('cfase') cfase: string, @Query() query: PaginationDto) {
    return this.faseAccionService.findAll(cfase, query);
  }

  @Patch(':cfase/acciones/:caccion')
  @Roles('ADMIN')
  update(
    @Param('cfase') cfase: string,
    @Param('caccion') caccion: string,
    @Body() dto: UpdateFaseAccionDto,
  ) {
    return this.faseAccionService.update(cfase, caccion, dto);
  }

  @Patch(':cfase/acciones/:caccion/estado')
  @Roles('ADMIN')
  updateEstado(
    @Param('cfase') cfase: string,
    @Param('caccion') caccion: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.faseAccionService.updateEstado(cfase, caccion, dto);
  }
}
