import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { FaseService } from './fase.service';
import { CreateFaseDto } from './dto/create-fase.dto';
import { UpdateFaseDto } from './dto/update-fase.dto';
import { QueryFaseDto } from './dto/query-fase.dto';
import { UpdateEstadoDto } from '../../../common/dto/update-estado.dto';

@Controller('config/fases')
export class FaseController {
  constructor(private readonly faseService: FaseService) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateFaseDto) {
    return this.faseService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RRHH')
  findAll(@Query() query: QueryFaseDto) {
    return this.faseService.findAll(query);
  }

  @Get(':cfase')
  @Roles('ADMIN', 'RRHH')
  findOne(@Param('cfase') cfase: string) {
    return this.faseService.findOne(cfase);
  }

  @Patch(':cfase')
  @Roles('ADMIN')
  update(@Param('cfase') cfase: string, @Body() dto: UpdateFaseDto) {
    return this.faseService.update(cfase, dto);
  }

  @Patch(':cfase/estado')
  @Roles('ADMIN')
  updateEstado(@Param('cfase') cfase: string, @Body() dto: UpdateEstadoDto) {
    return this.faseService.updateEstado(cfase, dto);
  }
}
