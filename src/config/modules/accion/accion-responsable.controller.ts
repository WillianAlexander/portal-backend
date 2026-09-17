import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AccionResponsableService } from './accion-responsable.service';
import { CreateAccionResponsableDto } from './dto/create-accion-responsable.dto';
import { UpdateAccionResponsableDto } from './dto/update-accion-responsable.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Controller('config/acciones')
export class AccionResponsableController {
  constructor(private readonly accionResponsableService: AccionResponsableService) {}

  @Post(':caccion/responsables')
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Param('caccion') caccion: string, @Body() dto: CreateAccionResponsableDto) {
    return this.accionResponsableService.create(caccion, dto);
  }

  @Get(':caccion/responsables')
  @Roles('ADMIN', 'RRHH')
  findAll(@Param('caccion') caccion: string, @Query() query: PaginationDto) {
    return this.accionResponsableService.findAll(caccion, query);
  }

  @Patch(':caccion/responsables/:id')
  @Roles('ADMIN')
  update(
    @Param('caccion') caccion: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccionResponsableDto,
  ) {
    return this.accionResponsableService.update(caccion, id, dto);
  }

  @Patch(':caccion/responsables/:id/estado')
  @Roles('ADMIN')
  updateEstado(
    @Param('caccion') caccion: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.accionResponsableService.updateEstado(caccion, id, dto);
  }
}
