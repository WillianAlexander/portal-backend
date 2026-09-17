import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { OperacionService } from './operacion.service';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';
import { QueryOperacionDto } from './dto/query-operacion.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/operaciones')
export class OperacionController {
  constructor(private readonly operacionService: OperacionService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateOperacionDto) {
    return this.operacionService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryOperacionDto) {
    return this.operacionService.findAll(query);
  }

  @Get(':coperacion')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('coperacion') coperacion: string) {
    return this.operacionService.findOne(coperacion);
  }

  @Patch(':coperacion')
  @Roles('ADMIN')
  update(@Param('coperacion') coperacion: string, @Body() dto: UpdateOperacionDto) {
    return this.operacionService.update(coperacion, dto);
  }

  @Patch(':coperacion/estado')
  @Roles('ADMIN')
  updateEstado(@Param('coperacion') coperacion: string, @Body() dto: UpdateEstadoDto) {
    return this.operacionService.updateEstado(coperacion, dto);
  }
}
