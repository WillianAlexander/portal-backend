import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { validate } from 'class-validator';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

// ─── helpers ────────────────────────────────────────────────────────────────

function makePrisma() {
  return {
    tusuario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
}

/** Creates a roles-guard context where the metadata returns [ADMIN] (simulating @Roles(ADMIN)). */
function makeRolesCtx(rol: RolUsuario | undefined) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: rol ? { sub: 'u01', rol } : undefined }),
    }),
  } as any;
}

// ─── Sección 1: control de acceso (tests 1–5) ───────────────────────────────

describe('AdminController — control de acceso por rol', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    // Simulate @Roles(ADMIN) metadata already set on the class/handler
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([RolUsuario.ADMIN]) } as any;
    guard = new RolesGuard(reflector);
  });

  // Test 1
  it('permite acceso a rol ADMIN', () => {
    expect(guard.canActivate(makeRolesCtx(RolUsuario.ADMIN))).toBe(true);
  });

  // Test 2
  it('rechaza rol RRHH con ForbiddenException', () => {
    expect(() => guard.canActivate(makeRolesCtx(RolUsuario.RRHH))).toThrow(ForbiddenException);
  });

  // Test 3
  it('rechaza rol JEFE con ForbiddenException', () => {
    expect(() => guard.canActivate(makeRolesCtx(RolUsuario.JEFE))).toThrow(ForbiddenException);
  });

  // Test 4
  it('rechaza rol EMPLEADO con ForbiddenException', () => {
    expect(() => guard.canActivate(makeRolesCtx(RolUsuario.EMPLEADO))).toThrow(ForbiddenException);
  });

  // Test 5: sin JWT, el primer guard de la cadena (JwtAuthGuard) rechaza antes que RolesGuard.
  // RolesGuard también rechaza cuando request.user está ausente (defensa en profundidad).
  it('request sin usuario autenticado es rechazado (defensa en profundidad de RolesGuard)', () => {
    // En producción JwtAuthGuard lanza UnauthorizedException (401) antes que RolesGuard.
    // Este test verifica que RolesGuard también rechaza si el user llega vacío al segundo guard.
    expect(() => guard.canActivate(makeRolesCtx(undefined))).toThrow(ForbiddenException);
  });
});

// ─── Sección 2: roles en creación de usuario (tests 6–10) ───────────────────

describe('AdminController.crear — campo rol', () => {
  let controller: AdminController;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new AdminController(prisma);
    prisma.tusuario.findFirst.mockResolvedValue(null); // no duplicados
  });

  function makeDto(overrides: Partial<CreateUsuarioDto> = {}): CreateUsuarioDto {
    return Object.assign(new CreateUsuarioDto(), {
      cempleado: 'u01',
      cedula: '0102030405',
      nombre: 'Test User',
      email: 'test@coopgualaquiza.fin.ec',
      ...overrides,
    });
  }

  // Test 6
  it('crea usuario con EMPLEADO cuando no se envía rol', async () => {
    prisma.tusuario.create.mockResolvedValue({ cempleado: 'u01', rol: RolUsuario.EMPLEADO });
    await controller.crear(makeDto());
    expect(prisma.tusuario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rol: RolUsuario.EMPLEADO }) }),
    );
  });

  // Test 7
  it('crea usuario con JEFE cuando se envía rol JEFE', async () => {
    prisma.tusuario.create.mockResolvedValue({ cempleado: 'u01', rol: RolUsuario.JEFE });
    await controller.crear(makeDto({ rol: RolUsuario.JEFE }));
    expect(prisma.tusuario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rol: RolUsuario.JEFE }) }),
    );
  });

  // Test 8
  it('crea usuario con RRHH cuando se envía rol RRHH', async () => {
    prisma.tusuario.create.mockResolvedValue({ cempleado: 'u01', rol: RolUsuario.RRHH });
    await controller.crear(makeDto({ rol: RolUsuario.RRHH }));
    expect(prisma.tusuario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rol: RolUsuario.RRHH }) }),
    );
  });

  // Test 9
  it('crea usuario con ADMIN cuando se envía rol ADMIN', async () => {
    prisma.tusuario.create.mockResolvedValue({ cempleado: 'u01', rol: RolUsuario.ADMIN });
    await controller.crear(makeDto({ rol: RolUsuario.ADMIN }));
    expect(prisma.tusuario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rol: RolUsuario.ADMIN }) }),
    );
  });

  // Test 10: DTO validation via class-validator
  it('valida que rol inválido produce error de validación en el DTO', async () => {
    const dto = makeDto({ rol: 'SUPERADMIN' as any });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'rol')).toBe(true);
  });
});

// ─── Sección 3: listado devuelve rol (test 11) ───────────────────────────────

describe('AdminController.listar — incluye campo rol', () => {
  let controller: AdminController;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new AdminController(prisma);
  });

  // Test 11
  it('el select del listado incluye rol', () => {
    prisma.tusuario.findMany.mockResolvedValue([]);
    controller.listar();
    expect(prisma.tusuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ rol: true }) }),
    );
  });
});

// ─── Sección 4: protección del último ADMIN — eliminar (tests 12–14) ─────────

describe('AdminController.eliminar — protección de último ADMIN', () => {
  let controller: AdminController;
  let prisma: ReturnType<typeof makePrisma>;
  let tx: any;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new AdminController(prisma);
    tx = {
      tusuario: {
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  // Test 12
  it('permite eliminar un usuario no ADMIN sin restricción', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.EMPLEADO });
    tx.tusuario.delete.mockResolvedValue({ cempleado: 'u01' });
    await controller.eliminar('u01');
    expect(tx.tusuario.count).not.toHaveBeenCalled();
    expect(tx.tusuario.delete).toHaveBeenCalledWith({ where: { cempleado: 'u01' } });
  });

  // Test 13
  it('permite eliminar un ADMIN cuando existen otros ADMIN', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.ADMIN });
    tx.tusuario.count.mockResolvedValue(2);
    tx.tusuario.delete.mockResolvedValue({ cempleado: 'admin02' });
    await controller.eliminar('admin02');
    expect(tx.tusuario.delete).toHaveBeenCalled();
  });

  // Test 14
  it('rechaza eliminar al último ADMIN con BadRequestException', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.ADMIN });
    tx.tusuario.count.mockResolvedValue(1);
    await expect(controller.eliminar('admin01')).rejects.toThrow(BadRequestException);
    expect(tx.tusuario.delete).not.toHaveBeenCalled();
  });
});

// ─── Sección 5: protección del último ADMIN — desactivar (tests 15–16) ───────

describe('AdminController.desactivar — protección de último ADMIN activo', () => {
  let controller: AdminController;
  let prisma: ReturnType<typeof makePrisma>;
  let tx: any;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new AdminController(prisma);
    tx = {
      tusuario: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  // Test 15
  it('permite desactivar un ADMIN cuando existen otros ADMIN activos', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.ADMIN, activo: true });
    tx.tusuario.count.mockResolvedValue(2);
    tx.tusuario.update.mockResolvedValue({ cempleado: 'admin02', nombre: 'Admin2', activo: false });
    await controller.desactivar('admin02');
    expect(tx.tusuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } }),
    );
  });

  // Test 16
  it('rechaza desactivar al último ADMIN activo con BadRequestException', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.ADMIN, activo: true });
    tx.tusuario.count.mockResolvedValue(1);
    await expect(controller.desactivar('admin01')).rejects.toThrow(BadRequestException);
    expect(tx.tusuario.update).not.toHaveBeenCalled();
  });
});

// ─── Sección 6: hardening de respuestas — sin datos sensibles ─────────────────

describe('AdminController — hardening de respuestas', () => {
  let controller: AdminController;
  let prisma: ReturnType<typeof makePrisma>;
  let tx: any;

  beforeEach(() => {
    prisma = makePrisma();
    controller = new AdminController(prisma);
    tx = {
      tusuario: {
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));
  });

  it('DELETE devuelve solo mensaje (sin datos del usuario)', async () => {
    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.EMPLEADO });
    tx.tusuario.delete.mockResolvedValue({});
    const result = await controller.eliminar('user01') as any;
    expect(result).toHaveProperty('message');
  });

  it('ninguna respuesta contiene la cadena ADMIN_API_KEY', async () => {
    prisma.tusuario.findMany.mockResolvedValue([]);
    const listarResult = controller.listar();
    expect(JSON.stringify(await listarResult)).not.toContain('ADMIN_API_KEY');

    tx.tusuario.findUnique.mockResolvedValue({ rol: RolUsuario.EMPLEADO });
    tx.tusuario.delete.mockResolvedValue({});
    const deleteResult = await controller.eliminar('u01') as any;
    expect(JSON.stringify(deleteResult)).not.toContain('ADMIN_API_KEY');
  });
});
