import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { ModuloService } from './modulo.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { QueryModuloDto } from './dto/query-modulo.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/modulos')
export class ModuloController {
  constructor(private readonly moduloService: ModuloService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateModuloDto) {
    return this.moduloService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryModuloDto) {
    return this.moduloService.findAll(query);
  }

  @Get(':cmodulo')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('cmodulo') cmodulo: string) {
    return this.moduloService.findOne(cmodulo);
  }

  @Patch(':cmodulo')
  @Roles('ADMIN')
  update(@Param('cmodulo') cmodulo: string, @Body() dto: UpdateModuloDto) {
    return this.moduloService.update(cmodulo, dto);
  }

  @Patch(':cmodulo/estado')
  @Roles('ADMIN')
  updateEstado(@Param('cmodulo') cmodulo: string, @Body() dto: UpdateEstadoDto) {
    return this.moduloService.updateEstado(cmodulo, dto);
  }
}
