import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export interface StartInstancePayload {
  cflujo: string;
  tipoEntidad?: string | null;
  idEntidad?: string | null;
  usuarioSolicitante: string;
}

export class StartInstanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cflujo: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipoEntidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idEntidad?: string;
}
