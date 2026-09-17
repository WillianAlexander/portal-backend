import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { AzureTokenVerifier } from './azure-token.verifier';

export interface LoginResponse {
  accessToken: string;
  user: Omit<JwtPayload, 'iat' | 'exp'>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly azureVerifier: AzureTokenVerifier,
  ) {}

  async loginAzure(azureIdToken: string): Promise<LoginResponse> {
    const claims = await this.azureVerifier.verify(azureIdToken);
    this.logger.log(`loginAzure → oid="${claims.oid}"`);

    // 1. Buscar por azureOid (flujo normal)
    let usuario = await this.prisma.tusuario.findUnique({
      where: { azureOid: claims.oid },
    });
    this.logger.log(`Búsqueda por azureOid: ${usuario ? `encontrado (${usuario.cempleado})` : 'no encontrado'}`);

    // 2. Fallback por email (solo primer login — vinculación segura)
    if (!usuario) {
      const email = claims.preferred_username ?? claims.email ?? '';
      if (email) {
        // Cargar TODOS los registros con ese email para detectar conflictos
        const candidates = await this.prisma.tusuario.findMany({ where: { email } });

        // Si algún candidato ya tiene un OID vinculado (distinto al actual),
        // rechazar: el email pertenece a otra identidad Azure registrada
        const alreadyLinked = candidates.some((u) => u.azureOid !== null);
        if (alreadyLinked) {
          this.logger.warn(`Fallback rechazado: email ya vinculado a otro OID`);
          throw new UnauthorizedException('Usuario no autorizado en el sistema');
        }

        // Si hay más de un registro sin OID con el mismo email, la vinculación
        // sería ambigua — rechazar hasta resolución manual
        if (candidates.length > 1) {
          this.logger.warn(`Fallback rechazado: email ambiguo (${candidates.length} registros sin OID)`);
          throw new UnauthorizedException('Usuario no autorizado en el sistema');
        }

        if (candidates.length === 1) {
          const candidate = candidates[0];
          // Atomic CAS: UPDATE ... WHERE azureOid IS NULL prevents concurrent races
          const { count } = await this.prisma.tusuario.updateMany({
            where: { cempleado: candidate.cempleado, azureOid: null },
            data: { azureOid: claims.oid },
          });
          if (count === 0) {
            // Another concurrent request won the race and linked first
            this.logger.warn(`Vínculo rechazado: cempleado=${candidate.cempleado} ya fue vinculado concurrentemente`);
            throw new UnauthorizedException('Usuario no autorizado en el sistema');
          }
          usuario = { ...candidate, azureOid: claims.oid };
          this.logger.log(`azureOid vinculado a ${candidate.cempleado}`);
        } else {
          this.logger.warn('Fallback de email: usuario no encontrado');
        }
      } else {
        this.logger.warn('Token sin email ni preferred_username — no se puede hacer fallback');
      }
    }

    if (!usuario || !usuario.activo) {
      this.logger.warn(`Login rechazado: usuario=${usuario?.cempleado ?? 'null'} activo=${usuario?.activo ?? 'null'}`);
      throw new UnauthorizedException('Usuario no autorizado en el sistema');
    }

    this.logger.log(`Login exitoso: ${usuario.cempleado} (${usuario.nombre})`);
    return this.buildResponse(usuario);
  }

  getMe(payload: JwtPayload): Omit<JwtPayload, 'iat' | 'exp'> {
    return {
      sub: payload.sub,
      cedula: payload.cedula,
      nombre: payload.nombre,
      rol: payload.rol,
      ...(payload.cargo && { cargo: payload.cargo }),
    };
  }

  private buildResponse(usuario: {
    cempleado: string;
    cedula: string;
    nombre: string;
    cargo: string | null;
    rol: import('@prisma/client').RolUsuario;
  }): LoginResponse {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: usuario.cempleado,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      rol: usuario.rol,
      ...(usuario.cargo && { cargo: usuario.cargo }),
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    };
  }
}
