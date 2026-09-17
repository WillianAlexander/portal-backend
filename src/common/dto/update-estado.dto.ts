import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EstadoConfig } from '@prisma/client';

export class UpdateEstadoDto {
  @IsEnum(EstadoConfig)
  estado: EstadoConfig;

  @IsString()
  @IsNotEmpty()
  usuarioModificacion: string;
}
