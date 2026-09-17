import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AccionService } from './accion.service';
import { CreateAccionDto } from './dto/create-accion.dto';
import { UpdateAccionDto } from './dto/update-accion.dto';
import { QueryAccionDto } from './dto/query-accion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/acciones')
export class AccionController {
  constructor(private readonly accionService: AccionService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateAccionDto) {
    return this.accionService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryAccionDto) {
    return this.accionService.findAll(query);
  }

  @Get(':caccion')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('caccion') caccion: string) {
    return this.accionService.findOne(caccion);
  }

  @Patch(':caccion')
  @Roles('ADMIN')
  update(@Param('caccion') caccion: string, @Body() dto: UpdateAccionDto) {
    return this.accionService.update(caccion, dto);
  }

  @Patch(':caccion/estado')
  @Roles('ADMIN')
  updateEstado(@Param('caccion') caccion: string, @Body() dto: UpdateEstadoDto) {
    return this.accionService.updateEstado(caccion, dto);
  }
}
