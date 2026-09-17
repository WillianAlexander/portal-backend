import { PrismaClient } from '@prisma/client';
import { seedTalentoHumano } from './seed-talento-humano';
import { seedUsuarios } from './seed-usuarios';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');
  await seedTalentoHumano(prisma);
  await seedUsuarios(prisma);
  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
