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

export class CreateAccionResponsableDto {
  @IsEnum(TipoResponsable)
  ctipoResponsable: TipoResponsable;

  @IsEnum(TipoAsignacion)
  tipoAsignacion: TipoAsignacion;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cgrupo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  crol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cindividuo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codigoResolver?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  prioridad?: number = 0;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  usuarioCreacion: string;
}
