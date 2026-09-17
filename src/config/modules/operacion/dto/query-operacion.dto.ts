import { IsEnum, IsOptional } from 'class-validator';
import { EstadoConfig, TipoOperacion } from '@prisma/client';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryOperacionDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TipoOperacion)
  tipo?: TipoOperacion;

  @IsOptional()
  @IsEnum(EstadoConfig)
  estado?: EstadoConfig;
}
