import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoOperacion } from '@prisma/client';

export class UpdateOperacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoOperacion)
  tipo?: TipoOperacion;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  metodoHttp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ruta?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caccion?: string | null;

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
