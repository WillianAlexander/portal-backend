import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const KNOWN_WEAK_PATTERNS = ['change-me', 'dev-secret', 'secret', 'password', '12345', 'changeme'];

function assertStrongSecrets(logger: Logger) {
  if (process.env.NODE_ENV !== 'production') return;

  const checks: [string, string | undefined][] = [
    ['JWT_SECRET', process.env.JWT_SECRET],
    ['ADMIN_API_KEY', process.env.ADMIN_API_KEY],
  ];

  for (const [name, value] of checks) {
    if (!value) {
      logger.error(`FATAL: ${name} no está configurado en producción`);
      process.exit(1);
    }
    const lower = value.toLowerCase();
    if (KNOWN_WEAK_PATTERNS.some((p) => lower.includes(p)) || value.length < 32) {
      logger.error(`FATAL: ${name} es un valor débil o demasiado corto para producción`);
      process.exit(1);
    }
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  assertStrongSecrets(logger);

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const rawOrigins = process.env.CORS_ORIGINS;
  const corsOrigin = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim())
    : process.env.NODE_ENV === 'production'
      ? []
      : '*';

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Aplicación corriendo en http://localhost:${port}/api`);
}

bootstrap();
