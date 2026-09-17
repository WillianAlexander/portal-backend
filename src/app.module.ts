import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule as WorkflowConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { WorkflowModule } from './workflow/workflow.module';
import { VacacionesModule } from './vacaciones/vacaciones.module';
import { ViaticosModule } from './viaticos/viaticos.module';
import { PermisosModule } from './permisos/permisos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    WorkflowConfigModule,
    AuthModule,
    WorkflowModule,
    VacacionesModule,
    ViaticosModule,
    PermisosModule,
    NotificacionesModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
