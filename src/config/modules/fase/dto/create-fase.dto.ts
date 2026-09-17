import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cfase: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  detalle: string;

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
