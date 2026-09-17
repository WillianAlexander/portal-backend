export interface ActionContext {
  instanciaId: number;
  cflujo: string;
  cmodulo: string;
  cproceso: string;
  cfase: string;
  caccion: string;
  usuario: string;
  usuarioSolicitante: string;
  tipoEntidad: string | null;
  idEntidad: string | null;
  inputJson: unknown;
}
