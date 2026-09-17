import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFlujoFasesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cfase: string;

  @IsInt()
  @Min(1)
  orden: number;

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
