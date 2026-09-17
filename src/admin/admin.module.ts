import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BootstrapController } from './bootstrap.controller';
import { AdminKeyGuard } from './guards/admin-key.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, BootstrapController],
  providers: [AdminKeyGuard],
})
export class AdminModule {}
