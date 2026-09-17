import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Roles(RolUsuario.ADMIN)
@Controller('admin/usuarios')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.tusuario.findMany({
      select: {
        cempleado: true,
        cedula: true,
        nombre: true,
        email: true,
        cargo: true,
        departamento: true,
        agencia: true,
        activo: true,
        rol: true,
        azureOid: true,
        fechaCreacion: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  @Post()
  async crear(@Body() dto: CreateUsuarioDto) {
    const existe = await this.prisma.tusuario.findFirst({
      where: { OR: [{ cempleado: dto.cempleado }, { cedula: dto.cedula }, { email: dto.email }] },
    });

    if (existe) {
      const campo =
        existe.cempleado === dto.cempleado ? 'cempleado' :
        existe.cedula    === dto.cedula    ? 'cédula'    : 'email';
      throw new ConflictException(`Ya existe un usuario con ese ${campo}`);
    }

    return this.prisma.tusuario.create({
      data: {
        cempleado:    dto.cempleado,
        cedula:       dto.cedula,
        nombre:       dto.nombre,
        email:        dto.email,
        cargo:        dto.cargo,
        departamento: dto.departamento,
        agencia:      dto.agencia,
        rol:          dto.rol ?? RolUsuario.EMPLEADO,
        activo:       true,
      },
      select: {
        cempleado: true, cedula: true, nombre: true,
        email: true, cargo: true, departamento: true, agencia: true, activo: true, rol: true,
      },
    });
  }

  @Patch(':cempleado/desactivar')
  async desactivar(@Param('cempleado') cempleado: string) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.tusuario.findUnique({
        where: { cempleado },
        select: { rol: true, activo: true },
      });

      if (usuario?.rol === RolUsuario.ADMIN && usuario.activo) {
        const adminActivoCount = await tx.tusuario.count({
          where: { rol: RolUsuario.ADMIN, activo: true },
        });
        if (adminActivoCount <= 1) {
          throw new BadRequestException(
            'No se puede desactivar al único administrador activo del sistema. Active primero otro usuario con rol ADMIN.',
          );
        }
      }

      return tx.tusuario.update({
        where: { cempleado },
        data: { activo: false },
        select: { cempleado: true, nombre: true, activo: true },
      });
    });
  }

  @Patch(':cempleado/activar')
  activar(@Param('cempleado') cempleado: string) {
    return this.prisma.tusuario.update({
      where: { cempleado },
      data: { activo: true },
      select: { cempleado: true, nombre: true, activo: true },
    });
  }

  @Delete(':cempleado')
  async eliminar(@Param('cempleado') cempleado: string) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.tusuario.findUnique({
        where: { cempleado },
        select: { rol: true },
      });

      if (usuario?.rol === RolUsuario.ADMIN) {
        const totalAdmins = await tx.tusuario.count({ where: { rol: RolUsuario.ADMIN } });
        if (totalAdmins <= 1) {
          throw new BadRequestException(
            'No se puede eliminar al único administrador del sistema. Asigne primero otro usuario con rol ADMIN.',
          );
        }
      }

      await tx.tusuario.delete({ where: { cempleado } });
      return { message: 'Usuario eliminado correctamente' };
    });
  }
}
