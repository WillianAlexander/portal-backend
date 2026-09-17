import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detalle?: string;

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
