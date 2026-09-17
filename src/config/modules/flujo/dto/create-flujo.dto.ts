import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFlujoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cflujo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cmodulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cproceso: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cgrupofirmante?: string;

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
