import { IsEnum, IsOptional } from 'class-validator';
import { EstadoConfig } from '@prisma/client';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryModuloDto extends PaginationDto {
  @IsOptional()
  @IsEnum(EstadoConfig)
  estado?: EstadoConfig;
}
