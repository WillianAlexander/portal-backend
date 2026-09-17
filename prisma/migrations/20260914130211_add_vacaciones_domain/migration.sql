-- CreateEnum
CREATE TYPE "EstadoSolicitudVacaciones" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CERTIFICADO_GENERADO');

-- CreateTable
CREATE TABLE "tsolicitudvacaciones" (
    "id" SERIAL NOT NULL,
    "id_instancia_workflow" INTEGER NOT NULL,
    "usuario_solicitante" VARCHAR(100) NOT NULL,
    "fecha_inicio_vac" DATE NOT NULL,
    "fecha_fin_vac" DATE NOT NULL,
    "dias_solicitados" INTEGER NOT NULL,
    "estado" "EstadoSolicitudVacaciones" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "usuario_aprobador" VARCHAR(100),
    "fecha_resolucion" TIMESTAMP(3),
    "certificado_ref" VARCHAR(200),
    "fecha_certificado" TIMESTAMP(3),
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tsolicitudvacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tjefeempleado" (
    "cempleado" VARCHAR(100) NOT NULL,
    "cjefe" VARCHAR(100) NOT NULL,

    CONSTRAINT "tjefeempleado_pkey" PRIMARY KEY ("cempleado")
);

-- CreateIndex
CREATE UNIQUE INDEX "tsolicitudvacaciones_id_instancia_workflow_key" ON "tsolicitudvacaciones"("id_instancia_workflow");

-- CreateIndex
CREATE INDEX "tsolicitudvacaciones_usuario_solicitante_idx" ON "tsolicitudvacaciones"("usuario_solicitante");

-- CreateIndex
CREATE INDEX "tjefeempleado_cjefe_idx" ON "tjefeempleado"("cjefe");

-- AddForeignKey
ALTER TABLE "tsolicitudvacaciones" ADD CONSTRAINT "tsolicitudvacaciones_id_instancia_workflow_fkey" FOREIGN KEY ("id_instancia_workflow") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
