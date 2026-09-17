import { IsOptional, IsString } from 'class-validator';

export interface ExecuteActionPayload {
  usuario: string;
  inputJson?: unknown;
  comentario?: string | null;
}

export class ExecuteActionDto {
  @IsOptional()
  inputJson?: unknown;

  @IsOptional()
  @IsString()
  comentario?: string;
}
