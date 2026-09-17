import { NotFoundException } from '@nestjs/common';
import { WorkflowQueryService } from './workflow-query.service';
import { BandejaQueryDto } from '../dto/bandeja-query.dto';

function makeService(overrides: Record<string, any> = {}) {
  const prisma = {
    tprocesoinstancia: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    tprocesoinstanciaresponsable: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ...overrides,
  };
  return { service: new WorkflowQueryService(prisma as any), prisma };
}

const baseInstancia = {
  id: 1,
  cflujo: 'FLUJO_VAC',
  cmodulo: 'TALENTO',
  cproceso: 'VACACIONES',
  cfaseActual: 'APROBACION',
  estado: 'EN_PROCESO',
  usuarioSolicitante: 'user01',
  version: 1,
  fechaCreacion: new Date(),
  responsables: [],
  historial: [],
  ejecuciones: [],
  solicitudVacaciones: null,
};

describe('WorkflowQueryService.getInstancia', () => {
  it('retorna la instancia con relaciones cuando existe', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findUnique.mockResolvedValue(baseInstancia);

    const result = await service.getInstancia(1, 'user01', 'ADMIN');

    expect(result).toEqual(baseInstancia);
    expect(prisma.tprocesoinstancia.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('lanza NotFoundException cuando la instancia no existe', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findUnique.mockResolvedValue(null);

    await expect(service.getInstancia(99, 'user01', 'ADMIN')).rejects.toThrow(NotFoundException);
  });
});

describe('WorkflowQueryService.getMisTareas', () => {
  const tarea = {
    id: 1,
    cindividuo: 'user01',
    cfase: 'SOLICITUD',
    caccion: 'SOLICITAR_VACACIONES',
    estado: 'PENDIENTE',
    instancia: { ...baseInstancia, solicitudVacaciones: null },
  };

  it('retorna tareas PENDIENTE paginadas para el usuario', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstanciaresponsable.findMany.mockResolvedValue([tarea]);
    prisma.tprocesoinstanciaresponsable.count.mockResolvedValue(1);

    const result = await service.getMisTareas('user01', { page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(prisma.tprocesoinstanciaresponsable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cindividuo: 'user01', estado: 'PENDIENTE' }),
      }),
    );
  });

  it('aplica filtro por cmodulo a través de la instancia', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstanciaresponsable.findMany.mockResolvedValue([]);
    prisma.tprocesoinstanciaresponsable.count.mockResolvedValue(0);

    const query: BandejaQueryDto = { page: 1, limit: 20, cmodulo: 'TALENTO' };
    await service.getMisTareas('user01', query);

    expect(prisma.tprocesoinstanciaresponsable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instancia: expect.objectContaining({ cmodulo: 'TALENTO' }),
        }),
      }),
    );
  });

  it('no añade filtro instancia cuando no hay filtros opcionales', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstanciaresponsable.findMany.mockResolvedValue([]);
    prisma.tprocesoinstanciaresponsable.count.mockResolvedValue(0);

    await service.getMisTareas('user01', { page: 1, limit: 20 });

    const callArgs = prisma.tprocesoinstanciaresponsable.findMany.mock.calls[0][0];
    expect(callArgs.where.instancia).toBeUndefined();
  });

  it('respeta skip/take para paginación', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstanciaresponsable.findMany.mockResolvedValue([]);
    prisma.tprocesoinstanciaresponsable.count.mockResolvedValue(25);

    await service.getMisTareas('user01', { page: 2, limit: 10 });

    expect(prisma.tprocesoinstanciaresponsable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

describe('WorkflowQueryService.getMisProcesos', () => {
  it('retorna instancias del solicitante paginadas', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findMany.mockResolvedValue([baseInstancia]);
    prisma.tprocesoinstancia.count.mockResolvedValue(1);

    const result = await service.getMisProcesos('user01', { page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(prisma.tprocesoinstancia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuarioSolicitante: 'user01' }),
      }),
    );
  });

  it('aplica filtro por estado', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findMany.mockResolvedValue([]);
    prisma.tprocesoinstancia.count.mockResolvedValue(0);

    await service.getMisProcesos('user01', { page: 1, limit: 20, estado: 'COMPLETADO' as any });

    expect(prisma.tprocesoinstancia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'COMPLETADO' }),
      }),
    );
  });

  it('incluye solicitudVacaciones en el resultado', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findMany.mockResolvedValue([baseInstancia]);
    prisma.tprocesoinstancia.count.mockResolvedValue(1);

    await service.getMisProcesos('user01', { page: 1, limit: 20 });

    expect(prisma.tprocesoinstancia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ solicitudVacaciones: true }),
      }),
    );
  });

  it('retorna meta con totalPages correcto', async () => {
    const { service, prisma } = makeService();
    prisma.tprocesoinstancia.findMany.mockResolvedValue([]);
    prisma.tprocesoinstancia.count.mockResolvedValue(45);

    const result = await service.getMisProcesos('user01', { page: 1, limit: 20 });

    expect(result.meta.totalPages).toBe(3);
  });
});
