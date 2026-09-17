import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoInstancia } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BandejaQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  cmodulo?: string;

  @IsOptional()
  @IsString()
  cproceso?: string;

  @IsOptional()
  @IsString()
  cflujo?: string;

  @IsOptional()
  @IsEnum(EstadoInstancia)
  estado?: EstadoInstancia;
}
