-- CreateEnum
CREATE TYPE "EstadoSolicitudPermiso" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'FINALIZADA');

-- CreateTable
CREATE TABLE "tsolicitudpermisos" (
    "id" SERIAL NOT NULL,
    "id_instancia_workflow" INTEGER NOT NULL,
    "usuario_solicitante" VARCHAR(100) NOT NULL,
    "tipo_permiso" VARCHAR(100) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "motivo_permiso" VARCHAR(500),
    "estado" "EstadoSolicitudPermiso" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "usuario_aprobador" VARCHAR(100),
    "fecha_resolucion" TIMESTAMP(3),
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tsolicitudpermisos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tsolicitudpermisos_id_instancia_workflow_key" ON "tsolicitudpermisos"("id_instancia_workflow");

-- CreateIndex
CREATE INDEX "tsolicitudpermisos_usuario_solicitante_idx" ON "tsolicitudpermisos"("usuario_solicitante");

-- AddForeignKey
ALTER TABLE "tsolicitudpermisos" ADD CONSTRAINT "tsolicitudpermisos_id_instancia_workflow_fkey" FOREIGN KEY ("id_instancia_workflow") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
