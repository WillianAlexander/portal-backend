import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoConfig, TipoEjecucion } from '@prisma/client';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryAccionDto extends PaginationDto {
  @IsOptional()
  @IsString()
  tipoAccion?: string;

  @IsOptional()
  @IsEnum(TipoEjecucion)
  tipoEjecucion?: TipoEjecucion;

  @IsOptional()
  @IsEnum(EstadoConfig)
  estado?: EstadoConfig;
}
