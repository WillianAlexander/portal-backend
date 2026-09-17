import { IsEnum, IsOptional } from 'class-validator';
import { EstadoNotificacion } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class NotificacionesQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(EstadoNotificacion)
  estado?: EstadoNotificacion;
}
