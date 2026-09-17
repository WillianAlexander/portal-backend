import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoInstancia } from '@prisma/client';

export class UpdateFaseAccionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  @IsBoolean()
  esTerminal?: boolean;

  @IsOptional()
  @IsEnum(EstadoInstancia)
  estadoFinalInstancia?: EstadoInstancia | null;

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
