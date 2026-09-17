import { NotFoundException } from '@nestjs/common';
import { EstadoNotificacion } from '@prisma/client';
import { NotificacionService } from './notificacion.service';

function makeService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    tnotificacion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    ...prismaOverrides,
  };
  return { service: new NotificacionService(prisma as any), prisma };
}

const fakeTx: any = {
  tnotificacion: {
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 2 }),
  },
};

describe('NotificacionService.notificarResponsables', () => {
  it('llama createMany con un registro por individuo', async () => {
    const { service } = makeService();
    fakeTx.tnotificacion.createMany.mockResolvedValue({ count: 2 });

    await service.notificarResponsables(10, 'APROBACION', 'APROBAR_VACACIONES', 'VACACIONES', ['jefe01', 'jefe02'], fakeTx);

    expect(fakeTx.tnotificacion.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ cindividuo: 'jefe01', idInstancia: 10 }),
        expect.objectContaining({ cindividuo: 'jefe02', idInstancia: 10 }),
      ]),
    });
  });

  it('no llama createMany cuando la lista de individuos está vacía', async () => {
    const { service } = makeService();
    fakeTx.tnotificacion.createMany.mockClear();

    await service.notificarResponsables(10, 'APROBACION', 'APROBAR_VACACIONES', 'VACACIONES', [], fakeTx);

    expect(fakeTx.tnotificacion.createMany).not.toHaveBeenCalled();
  });
});

describe('NotificacionService.notificarSolicitante', () => {
  it('crea una notificación para el solicitante con los datos dados', async () => {
    const { service } = makeService();
    fakeTx.tnotificacion.create.mockResolvedValue({});

    await service.notificarSolicitante(10, 'GENERAR_CERTIFICADO', 'user01', 'Proceso COMPLETADO', 'Su solicitud finalizó.', fakeTx);

    expect(fakeTx.tnotificacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idInstancia: 10,
        cindividuo: 'user01',
        titulo: 'Proceso COMPLETADO',
        caccion: 'GENERAR_CERTIFICADO',
      }),
    });
  });
});

describe('NotificacionService.getMisNotificaciones', () => {
  const notif = { id: 1, cindividuo: 'user01', titulo: 'Test', estado: 'PENDIENTE', fechaCreacion: new Date() };

  it('retorna notificaciones paginadas del usuario', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findMany.mockResolvedValue([notif]);
    prisma.tnotificacion.count.mockResolvedValue(1);

    const result = await service.getMisNotificaciones('user01', { page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(prisma.tnotificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cindividuo: 'user01' } }),
    );
  });

  it('aplica filtro por estado cuando se especifica', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findMany.mockResolvedValue([]);
    prisma.tnotificacion.count.mockResolvedValue(0);

    await service.getMisNotificaciones('user01', { page: 1, limit: 20, estado: EstadoNotificacion.PENDIENTE });

    expect(prisma.tnotificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cindividuo: 'user01', estado: EstadoNotificacion.PENDIENTE },
      }),
    );
  });
});

describe('NotificacionService.marcarLeida', () => {
  it('actualiza estado a LEIDA y registra fechaLectura', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findUnique.mockResolvedValue({
      id: 1, cindividuo: 'user01', estado: EstadoNotificacion.PENDIENTE,
    });
    prisma.tnotificacion.update.mockResolvedValue({});

    await service.marcarLeida(1, 'user01');

    expect(prisma.tnotificacion.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ estado: EstadoNotificacion.LEIDA }),
    });
  });

  it('lanza NotFoundException cuando la notificación no existe', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findUnique.mockResolvedValue(null);

    await expect(service.marcarLeida(99, 'user01')).rejects.toThrow(NotFoundException);
  });

  it('lanza NotFoundException cuando el usuario no es el destinatario', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findUnique.mockResolvedValue({
      id: 1, cindividuo: 'user02', estado: EstadoNotificacion.PENDIENTE,
    });

    await expect(service.marcarLeida(1, 'user01')).rejects.toThrow(NotFoundException);
  });

  it('es idempotente: no actualiza si ya está en LEIDA', async () => {
    const { service, prisma } = makeService();
    prisma.tnotificacion.findUnique.mockResolvedValue({
      id: 1, cindividuo: 'user01', estado: EstadoNotificacion.LEIDA,
    });

    await service.marcarLeida(1, 'user01');

    expect(prisma.tnotificacion.update).not.toHaveBeenCalled();
  });
});
