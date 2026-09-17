import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoEjecucion } from '@prisma/client';

export class CreateAccionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  caccion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoAccion: string;

  @IsEnum(TipoEjecucion)
  tipoEjecucion: TipoEjecucion;

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
