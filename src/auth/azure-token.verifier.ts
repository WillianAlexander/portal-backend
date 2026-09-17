import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export const JWKS_CLIENT = Symbol('JWKS_CLIENT');

export interface IJwksClient {
  getSigningKey(kid?: string): Promise<{ getPublicKey(): string }>;
}

export interface AzureIdTokenClaims {
  oid: string;
  tid: string;
  preferred_username?: string;
  email?: string;
  name?: string;
}

@Injectable()
export class AzureTokenVerifier {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly issuer: string;

  constructor(
    @Inject(JWKS_CLIENT) private readonly jwks: IJwksClient,
    config: ConfigService,
  ) {
    this.tenantId = config.getOrThrow<string>('AZURE_TENANT_ID');
    this.clientId = config.getOrThrow<string>('AZURE_CLIENT_ID');
    this.issuer = `https://login.microsoftonline.com/${this.tenantId}/v2.0`;
  }

  async verify(token: string): Promise<AzureIdTokenClaims> {
    const claims = await this.verifySignature(token);

    // Belt-and-suspenders: tid must match even if issuer already encodes tenant
    if (claims.tid !== this.tenantId) {
      throw new UnauthorizedException('Token de tenant no autorizado');
    }
    if (!claims.oid) {
      throw new UnauthorizedException('Token Azure inválido: falta OID');
    }
    return claims;
  }

  private verifySignature(token: string): Promise<AzureIdTokenClaims> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwks
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((err: Error) => callback(err));
        },
        {
          algorithms: ['RS256'],
          issuer: this.issuer,
          audience: this.clientId,
        },
        (err, decoded) => {
          if (err) {
            reject(new UnauthorizedException(`Token Azure inválido: ${err.message}`));
          } else {
            resolve(decoded as AzureIdTokenClaims);
          }
        },
      );
    });
  }
}
