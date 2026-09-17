import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { FlujoService } from './flujo.service';
import { CreateFlujoDto } from './dto/create-flujo.dto';
import { UpdateFlujoDto } from './dto/update-flujo.dto';
import { QueryFlujoDto } from './dto/query-flujo.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/flujos')
export class FlujoController {
  constructor(private readonly flujoService: FlujoService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateFlujoDto) {
    return this.flujoService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryFlujoDto) {
    return this.flujoService.findAll(query);
  }

  @Get(':cflujo')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('cflujo') cflujo: string) {
    return this.flujoService.findOne(cflujo);
  }

  @Patch(':cflujo')
  @Roles('ADMIN')
  update(@Param('cflujo') cflujo: string, @Body() dto: UpdateFlujoDto) {
    return this.flujoService.update(cflujo, dto);
  }

  @Patch(':cflujo/estado')
  @Roles('ADMIN')
  updateEstado(@Param('cflujo') cflujo: string, @Body() dto: UpdateEstadoDto) {
    return this.flujoService.updateEstado(cflujo, dto);
  }
}
