import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoConfig } from '@prisma/client';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryProcesoDto extends PaginationDto {
  @IsOptional()
  @IsString()
  cmodulo?: string;

  @IsOptional()
  @IsEnum(EstadoConfig)
  estado?: EstadoConfig;
}
