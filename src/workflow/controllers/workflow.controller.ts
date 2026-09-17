import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { WorkflowExecutionService } from '../services/workflow-execution.service';
import { WorkflowQueryService } from '../services/workflow-query.service';
import { StartInstanceDto } from '../dto/start-instance.dto';
import { ExecuteActionDto } from '../dto/execute-action.dto';
import { WorkflowQueryDto } from '../dto/workflow-query.dto';
import { BandejaQueryDto } from '../dto/bandeja-query.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly executionService: WorkflowExecutionService,
    private readonly queryService: WorkflowQueryService,
  ) {}

  @Post('instancias')
  iniciarInstancia(@Body() dto: StartInstanceDto, @CurrentUser() user: string) {
    return this.executionService.iniciarInstancia({
      cflujo: dto.cflujo,
      tipoEntidad: dto.tipoEntidad,
      idEntidad: dto.idEntidad,
      usuarioSolicitante: user,
    });
  }

  @Get('instancias')
  listInstancias(
    @Query() query: WorkflowQueryDto,
    @CurrentUser('payload') user: JwtPayload,
  ) {
    return this.queryService.listInstancias(query, user.sub, user.rol);
  }

  @Get('instancias/:id')
  getInstancia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('payload') user: JwtPayload,
  ) {
    return this.queryService.getInstancia(id, user.sub, user.rol);
  }

  @Post('instancias/:id/acciones/:caccion/ejecutar')
  ejecutarAccion(
    @Param('id', ParseIntPipe) id: number,
    @Param('caccion') caccion: string,
    @Body() dto: ExecuteActionDto,
    @CurrentUser() user: string,
  ) {
    return this.executionService.ejecutarAccion(id, caccion, {
      usuario: user,
      inputJson: dto.inputJson,
      comentario: dto.comentario,
    });
  }

  @Get('tareas')
  getMisTareas(@CurrentUser() user: string, @Query() query: BandejaQueryDto) {
    return this.queryService.getMisTareas(user, query);
  }

  @Get('mis-procesos')
  getMisProcesos(@CurrentUser() user: string, @Query() query: BandejaQueryDto) {
    return this.queryService.getMisProcesos(user, query);
  }
}
