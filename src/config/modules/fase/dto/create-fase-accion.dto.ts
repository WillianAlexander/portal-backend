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

export class CreateFaseAccionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  caccion: string;

  @IsInt()
  @Min(1)
  orden: number;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean = false;

  @IsOptional()
  @IsBoolean()
  esTerminal?: boolean = false;

  @IsOptional()
  @IsEnum(EstadoInstancia)
  estadoFinalInstancia?: EstadoInstancia;

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
