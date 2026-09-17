// @nestjs/jwt ships as ESM in v12 — mock before Jest tries to load it.
// jest.mock calls are hoisted by Jest above the imports below.
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));

import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AzureTokenVerifier, JWKS_CLIENT } from './azure-token.verifier';

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const CLAIMS = {
  oid: 'oid-BBB',
  tid: 'tenant-id',
  preferred_username: 'usuario@coop.ec',
  name: 'Usuario Test',
};

const BASE_USUARIO = {
  cempleado: 'user01',
  cedula: '1234567890',
  nombre: 'Usuario Test',
  cargo: 'Analista',
  rol: 'EMPLEADO' as const,
  activo: true,
  email: 'usuario@coop.ec',
  azureOid: null as string | null,
  departamento: 'RRHH',
  agencia: null,
  fechaCreacion: new Date(),
  fechaModificacion: null,
};

// ──────────────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────────────

const mockPrisma = {
  tusuario: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-jwt'),
};

// AzureTokenVerifier is mocked — its internal JWKS logic is tested separately
const mockVerifier = {
  verify: jest.fn().mockResolvedValue(CLAIMS),
};

// ──────────────────────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────────────────────

describe('AuthService.loginAzure', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVerifier.verify.mockResolvedValue(CLAIMS);
    mockJwt.sign.mockReturnValue('signed-jwt');
    mockPrisma.tusuario.updateMany.mockResolvedValue({ count: 1 });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AzureTokenVerifier, useValue: mockVerifier },
        { provide: JWKS_CLIENT, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ── Caso A — OID ya vinculado ───────────────────────────────────────────────

  describe('Caso A — azureOid ya vinculado (flujo normal)', () => {
    it('login exitoso sin tocar el fallback de email', async () => {
      const usuario = { ...BASE_USUARIO, azureOid: 'oid-BBB' };
      mockPrisma.tusuario.findUnique.mockResolvedValue(usuario);

      const result = await service.loginAzure('any-token');

      expect(result.accessToken).toBe('signed-jwt');
      expect(mockPrisma.tusuario.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.tusuario.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Caso B — Primer login (vinculación permitida) ───────────────────────────

  describe('Caso B — primer login: usuario sin OID + email coincidente', () => {
    it('vincula el azureOid con updateMany atómico y devuelve JWT', async () => {
      const candidato = { ...BASE_USUARIO, azureOid: null };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([candidato]);
      mockPrisma.tusuario.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.loginAzure('any-token');

      expect(mockPrisma.tusuario.updateMany).toHaveBeenCalledWith({
        where: { cempleado: 'user01', azureOid: null },
        data: { azureOid: 'oid-BBB' },
      });
      expect(result.accessToken).toBe('signed-jwt');
    });
  });

  // ── Caso C — CRÍTICO: account takeover bloqueado ───────────────────────────

  describe('Caso C — email coincide pero el registro ya tiene otro OID', () => {
    it('lanza 401 y NO ejecuta updateMany (azureOid permanece AAA)', async () => {
      const usuarioConOidAAA = { ...BASE_USUARIO, azureOid: 'oid-AAA' };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null); // OID-BBB no existe
      mockPrisma.tusuario.findMany.mockResolvedValue([usuarioConOidAAA]);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza incluso si hay mezcla de registros (uno vinculado + uno libre)', async () => {
      const conOid = { ...BASE_USUARIO, cempleado: 'u1', azureOid: 'oid-AAA' };
      const sinOid = { ...BASE_USUARIO, cempleado: 'u2', azureOid: null };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([conOid, sinOid]);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Caso D — Concurrencia: exactamente un OID puede ganar ─────────────────

  describe('Caso D — concurrencia: race condition en primer vínculo', () => {
    it('lanza 401 cuando updateMany devuelve count=0 (otra petición ganó la carrera)', async () => {
      const candidato = { ...BASE_USUARIO, azureOid: null };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([candidato]);
      // Simula que otra petición concurrent ya escribió un OID distinto (AAA ganó, BBB pierde)
      mockPrisma.tusuario.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('updateMany incluye azureOid:null en el WHERE (condición atómica)', async () => {
      const candidato = { ...BASE_USUARIO, azureOid: null };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([candidato]);
      mockPrisma.tusuario.updateMany.mockResolvedValue({ count: 1 });

      await service.loginAzure('any-token');

      expect(mockPrisma.tusuario.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ azureOid: null }) }),
      );
    });
  });

  // ── Caso E — Email no existe ────────────────────────────────────────────────

  describe('Caso E — email no existe en DB', () => {
    it('lanza 401', async () => {
      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([]);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Caso F — Email duplicado sin OID ───────────────────────────────────────

  describe('Caso F — dos usuarios sin OID comparten el mismo email', () => {
    it('lanza 401 y NO vincula arbitrariamente a ninguno', async () => {
      const u1 = { ...BASE_USUARIO, cempleado: 'userA', azureOid: null };
      const u2 = { ...BASE_USUARIO, cempleado: 'userB', azureOid: null };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([u1, u2]);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Usuario inactivo ────────────────────────────────────────────────────────

  describe('Usuario inactivo', () => {
    it('lanza 401 incluso cuando azureOid coincide', async () => {
      const inactivo = { ...BASE_USUARIO, azureOid: 'oid-BBB', activo: false };
      mockPrisma.tusuario.findUnique.mockResolvedValue(inactivo);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza 401 si el usuario vinculado por email estaba inactivo', async () => {
      const candidatoInactivo = { ...BASE_USUARIO, azureOid: null, activo: false };

      mockPrisma.tusuario.findUnique.mockResolvedValue(null);
      mockPrisma.tusuario.findMany.mockResolvedValue([candidatoInactivo]);
      mockPrisma.tusuario.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Token sin email (sin preferred_username ni email) ──────────────────────

  describe('Token sin email', () => {
    it('lanza 401 cuando el token no contiene preferred_username ni email', async () => {
      mockVerifier.verify.mockResolvedValue({ oid: 'oid-BBB', tid: 'tenant-id' });
      mockPrisma.tusuario.findUnique.mockResolvedValue(null);

      await expect(service.loginAzure('any-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.findMany).not.toHaveBeenCalled();
    });
  });

  // ── Rol viene exclusivamente de DB ─────────────────────────────────────────

  describe('Rol desde DB (no desde token Azure)', () => {
    it('el JWT SACI lleva el rol del registro DB, nunca del token Azure', async () => {
      const usuarioAdmin = { ...BASE_USUARIO, azureOid: 'oid-BBB', rol: 'ADMIN' as const };
      mockPrisma.tusuario.findUnique.mockResolvedValue(usuarioAdmin);

      await service.loginAzure('any-token');

      const payload = mockJwt.sign.mock.calls[0][0];
      expect(payload.rol).toBe('ADMIN');
      // Los claims del token Azure (mockVerifier.verify) no tienen campo 'rol'
      expect(CLAIMS).not.toHaveProperty('rol');
    });

    it('el JWT SACI lleva el rol JEFE cuando la DB tiene JEFE', async () => {
      const usuarioJefe = { ...BASE_USUARIO, azureOid: 'oid-BBB', rol: 'JEFE' as const };
      mockPrisma.tusuario.findUnique.mockResolvedValue(usuarioJefe);

      await service.loginAzure('any-token');

      const payload = mockJwt.sign.mock.calls[0][0];
      expect(payload.rol).toBe('JEFE');
    });
  });

  // ── No regresión: verificador de firma sigue activo ────────────────────────

  describe('No regresión: token Azure inválido rechazado por el verificador', () => {
    it('propaga UnauthorizedException si AzureTokenVerifier rechaza el token', async () => {
      mockVerifier.verify.mockRejectedValueOnce(new UnauthorizedException('firma inválida'));

      await expect(service.loginAzure('tampered-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.tusuario.findUnique).not.toHaveBeenCalled();
    });
  });
});
