import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AzureTokenVerifier, JWKS_CLIENT } from './azure-token.verifier';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthService,
    AzureTokenVerifier,
    {
      provide: JWKS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const tenantId = config.getOrThrow<string>('AZURE_TENANT_ID');
        return jwksRsa({
          jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
          cache: true,
          cacheMaxAge: 600_000,
          rateLimit: true,
        });
      },
    },
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
