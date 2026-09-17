import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JefeEmpleadoService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerJefe(cempleado: string): Promise<string> {
    const rel = await this.prisma.tjefeempleado.findUnique({ where: { cempleado } });
    if (!rel) {
      throw new InternalServerErrorException(
        `No se encontró jefe para el empleado '${cempleado}'. Verifique la tabla TJEFEEMPLEADO.`,
      );
    }
    return rel.cjefe;
  }
}
