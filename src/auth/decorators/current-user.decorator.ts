import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | 'payload' | undefined, ctx: ExecutionContext): string | JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (field === 'payload') return request.user;
    if (field) return request.user[field] as string;
    return request.user.sub;
  },
);
