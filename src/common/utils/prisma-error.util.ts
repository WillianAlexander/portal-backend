import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = (error.meta?.target as string[])?.join(', ') ?? 'campo desconocido';
      throw new ConflictException(`Ya existe un registro con esos valores en: ${fields}`);
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Registro no encontrado');
    }
  }
  throw error;
}
