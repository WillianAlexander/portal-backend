-- =============================================================
-- MIGRACIÓN DE BACKFILL (Fase 4A/4B)
-- Captura cambios que fueron aplicados previamente via "prisma db push"
-- sin quedar registrados en el historial de migraciones.
--
-- En BD NUEVA: migrate deploy ejecuta este SQL normalmente. ✓
-- En BD ACTUAL (al momento de crear esta migración):
--   los objetos ya existían, por eso se marcó con:
--   prisma migrate resolve --applied 20260914200000_add_roles_viaticos_domain
--   (sin volver a ejecutar el SQL contra esa BD).
--
-- Reproducibilidad verificada: migrate deploy en modular_audit → OK.
-- =============================================================

-- CreateEnum: rol de acceso del usuario en el sistema
CREATE TYPE "RolUsuario" AS ENUM ('EMPLEADO', 'JEFE', 'RRHH', 'ADMIN');

-- AlterTable: tusuario — password_hash pasa a nullable (usuarios Azure no necesitan contraseña local)
ALTER TABLE "tusuario" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: tusuario — agregar soporte para Azure AD (azure_oid) y control de acceso (rol)
ALTER TABLE "tusuario" ADD COLUMN "azure_oid" VARCHAR(200);
ALTER TABLE "tusuario" ADD COLUMN "rol" "RolUsuario" NOT NULL DEFAULT 'EMPLEADO';

-- CreateIndex: azure_oid es único por usuario
CREATE UNIQUE INDEX "tusuario_azure_oid_key" ON "tusuario"("azure_oid");

-- CreateEnum: estado del ciclo de vida de una solicitud de viáticos
CREATE TYPE "EstadoSolicitudViaticos" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ORDEN_GENERADA');

-- CreateTable: solicitudes de anticipo de viáticos (dominio VIATICOS)
CREATE TABLE "tsolicitudviaticos" (
    "id" SERIAL NOT NULL,
    "id_instancia_workflow" INTEGER NOT NULL,
    "usuario_solicitante" VARCHAR(100) NOT NULL,
    "destino" VARCHAR(200) NOT NULL,
    "fecha_inicio_viaje" DATE NOT NULL,
    "fecha_fin_viaje" DATE NOT NULL,
    "motivo_viaje" VARCHAR(200),
    "monto_anticipo" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoSolicitudViaticos" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "usuario_aprobador" VARCHAR(100),
    "fecha_resolucion" TIMESTAMP(3),
    "orden_pago_ref" VARCHAR(200),
    "fecha_orden_pago" TIMESTAMP(3),
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tsolicitudviaticos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tsolicitudviaticos_id_instancia_workflow_key" ON "tsolicitudviaticos"("id_instancia_workflow");

-- CreateIndex
CREATE INDEX "tsolicitudviaticos_usuario_solicitante_idx" ON "tsolicitudviaticos"("usuario_solicitante");

-- AddForeignKey
ALTER TABLE "tsolicitudviaticos" ADD CONSTRAINT "tsolicitudviaticos_id_instancia_workflow_fkey" FOREIGN KEY ("id_instancia_workflow") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
