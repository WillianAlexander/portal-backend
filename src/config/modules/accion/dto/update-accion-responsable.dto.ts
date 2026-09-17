import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoAsignacion, TipoResponsable } from '@prisma/client';

export class UpdateAccionResponsableDto {
  @IsOptional()
  @IsEnum(TipoResponsable)
  ctipoResponsable?: TipoResponsable;

  @IsOptional()
  @IsEnum(TipoAsignacion)
  tipoAsignacion?: TipoAsignacion;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cgrupo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  crol?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cindividuo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codigoResolver?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  prioridad?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string | null;

  @IsOptional()
  @IsDateString()
  fechaFin?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  usuarioModificacion: string;
}
