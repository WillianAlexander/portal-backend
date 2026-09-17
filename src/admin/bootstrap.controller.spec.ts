import { UnauthorizedException } from '@nestjs/common';
import { AdminKeyGuard } from './guards/admin-key.guard';

function makeGuardCtx(headers: Record<string, string>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as any;
}

describe('AdminKeyGuard', () => {
  let guard: AdminKeyGuard;

  beforeEach(() => {
    const config = { get: jest.fn().mockReturnValue('correct-secret-key') } as any;
    guard = new AdminKeyGuard(config);
  });

  it('rechaza request con JWT pero sin x-admin-key (JWT no es sustituto)', () => {
    const ctx = makeGuardCtx({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test.test' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rechaza request sin header x-admin-key', () => {
    const ctx = makeGuardCtx({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rechaza request con API key incorrecta', () => {
    const ctx = makeGuardCtx({ 'x-admin-key': 'wrong-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('permite request con API key correcta', () => {
    const ctx = makeGuardCtx({ 'x-admin-key': 'correct-secret-key' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
