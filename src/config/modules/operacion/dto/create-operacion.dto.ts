import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoOperacion } from '@prisma/client';

export class CreateOperacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  coperacion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @IsEnum(TipoOperacion)
  tipo: TipoOperacion;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  metodoHttp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ruta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caccion?: string;

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
