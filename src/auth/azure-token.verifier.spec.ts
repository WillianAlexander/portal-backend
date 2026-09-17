import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AzureTokenVerifier, JWKS_CLIENT } from './azure-token.verifier';

// jwks-rsa is NOT imported here — the JWKS client is injected as a mock,
// keeping tests free of the jose ESM dependency.

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CLIENT_ID = 'ffffffff-0000-1111-2222-333333333333';
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;

// RSA key pairs generated once — reused across tests for speed
let privKeyPem: string;
let pubKeyPem: string;
let altPrivKeyPem: string; // different key to simulate fabricated tokens

beforeAll(() => {
  const kp1 = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  privKeyPem = kp1.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  pubKeyPem = kp1.publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const kp2 = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  altPrivKeyPem = kp2.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
});

const BASE_CLAIMS = {
  oid: 'user-oid-test-123',
  preferred_username: 'testuser@coopgualaquiza.fin.ec',
  name: 'Test User',
  tid: TENANT_ID,
  iss: ISSUER,
  aud: CLIENT_ID,
};

function makeToken(
  overrides: Record<string, unknown> = {},
  signingKey: string = privKeyPem,
): string {
  const payload = { ...BASE_CLAIMS, ...overrides };
  // If exp is in overrides, set it directly in payload (no expiresIn — they conflict)
  const signOptions: jwt.SignOptions = {
    algorithm: 'RS256',
    keyid: 'test-kid-001',
    ...('exp' in overrides ? {} : { expiresIn: '1h' }),
  };
  return jwt.sign(payload, signingKey, signOptions);
}

describe('AzureTokenVerifier', () => {
  let verifier: AzureTokenVerifier;
  let mockGetSigningKey: jest.Mock;

  beforeEach(async () => {
    mockGetSigningKey = jest.fn().mockResolvedValue({ getPublicKey: () => pubKeyPem });

    const module = await Test.createTestingModule({
      providers: [
        AzureTokenVerifier,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              ({ AZURE_TENANT_ID: TENANT_ID, AZURE_CLIENT_ID: CLIENT_ID })[key],
          },
        },
        {
          provide: JWKS_CLIENT,
          useValue: { getSigningKey: mockGetSigningKey },
        },
      ],
    }).compile();

    verifier = module.get(AzureTokenVerifier);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('accepts a validly signed ID token and returns claims', async () => {
    const token = makeToken();
    const claims = await verifier.verify(token);
    expect(claims.oid).toBe(BASE_CLAIMS.oid);
    expect(claims.preferred_username).toBe(BASE_CLAIMS.preferred_username);
    expect(claims.tid).toBe(TENANT_ID);
  });

  // ── Signature verification — CORE: decode ≠ validation ─────────────────────

  it('rejects a token signed with a different RSA private key (fabricated token)', async () => {
    // Same valid-looking claims but signed with a key Azure would never use
    const token = makeToken({}, altPrivKeyPem);
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token whose payload was tampered after signing', async () => {
    const token = makeToken();
    const [header, , sig] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        ...BASE_CLAIMS,
        oid: 'attacker-oid',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
    await expect(verifier.verify(`${header}.${tamperedPayload}.${sig}`)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── Issuer validation ────────────────────────────────────────────────────────

  it('rejects a token with wrong issuer', async () => {
    const token = makeToken({ iss: 'https://evil.example.com/v2.0' });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token from a different Azure tenant in the issuer', async () => {
    const token = makeToken({ iss: 'https://login.microsoftonline.com/other-tenant-id/v2.0' });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  // ── Audience validation ──────────────────────────────────────────────────────

  it('rejects a token with wrong audience (different app)', async () => {
    const token = makeToken({ aud: 'other-app-client-id-00000000' });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  // ── Tenant (tid) claim validation ────────────────────────────────────────────

  it('rejects a token where tid claim does not match configured tenant', async () => {
    // Issuer matches but tid claim is from a different tenant
    const token = makeToken({ tid: 'malicious-tenant-id' });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  // ── Expiration validation ────────────────────────────────────────────────────

  it('rejects an expired token', async () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  // ── Structural / format checks ───────────────────────────────────────────────

  it('rejects a malformed string that is not a JWT', async () => {
    await expect(verifier.verify('not-a-jwt-at-all')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a JWT with only two segments', async () => {
    await expect(verifier.verify('header.payload')).rejects.toThrow(UnauthorizedException);
  });

  // ── Missing required claims ──────────────────────────────────────────────────

  it('rejects a valid-signature token missing the oid claim', async () => {
    const { oid: _oid, ...claimsWithoutOid } = BASE_CLAIMS;
    const token = jwt.sign(claimsWithoutOid, privKeyPem, {
      algorithm: 'RS256',
      keyid: 'test-kid-001',
      expiresIn: '1h',
    });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  // ── JWKS retrieval failure ───────────────────────────────────────────────────

  it('rejects when JWKS key retrieval fails (network error)', async () => {
    mockGetSigningKey.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const token = makeToken();
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when kid is not found in JWKS (unknown signing key)', async () => {
    mockGetSigningKey.mockRejectedValueOnce(new Error('Unable to find a signing key'));
    const token = makeToken();
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });
});
