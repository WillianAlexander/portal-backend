import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { ProcesoService } from './proceso.service';
import { CreateProcesoDto } from './dto/create-proceso.dto';
import { UpdateProcesoDto } from './dto/update-proceso.dto';
import { QueryProcesoDto } from './dto/query-proceso.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/procesos')
export class ProcesoController {
  constructor(private readonly procesoService: ProcesoService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateProcesoDto) {
    return this.procesoService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryProcesoDto) {
    return this.procesoService.findAll(query);
  }

  @Get(':cmodulo/:cproceso')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('cmodulo') cmodulo: string, @Param('cproceso') cproceso: string) {
    return this.procesoService.findOne(cmodulo, cproceso);
  }

  @Patch(':cmodulo/:cproceso')
  @Roles('ADMIN')
  update(
    @Param('cmodulo') cmodulo: string,
    @Param('cproceso') cproceso: string,
    @Body() dto: UpdateProcesoDto,
  ) {
    return this.procesoService.update(cmodulo, cproceso, dto);
  }

  @Patch(':cmodulo/:cproceso/estado')
  @Roles('ADMIN')
  updateEstado(
    @Param('cmodulo') cmodulo: string,
    @Param('cproceso') cproceso: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.procesoService.updateEstado(cmodulo, cproceso, dto);
  }
}
