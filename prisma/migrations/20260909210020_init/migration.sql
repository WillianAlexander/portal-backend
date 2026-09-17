-- CreateEnum
CREATE TYPE "EstadoConfig" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoInstancia" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEjecucion" AS ENUM ('MANUAL', 'AUTOMATICA');

-- CreateEnum
CREATE TYPE "TipoResponsable" AS ENUM ('GRUPO', 'ROL', 'INDIVIDUO');

-- CreateEnum
CREATE TYPE "TipoAsignacion" AS ENUM ('ESTATICO', 'DINAMICO');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('PENDIENTE', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'LEIDA', 'PROCESADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('INTERNA', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "TipoOperacion" AS ENUM ('QUERY', 'COMMAND', 'WORKFLOW');

-- CreateEnum
CREATE TYPE "EstadoEjecucion" AS ENUM ('EN_PROCESO', 'EXITOSA', 'FALLIDA');

-- CreateTable
CREATE TABLE "tmodulo" (
    "cmodulo" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tmodulo_pkey" PRIMARY KEY ("cmodulo")
);

-- CreateTable
CREATE TABLE "tproceso" (
    "cmodulo" VARCHAR(50) NOT NULL,
    "cproceso" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tproceso_pkey" PRIMARY KEY ("cmodulo","cproceso")
);

-- CreateTable
CREATE TABLE "tflujo" (
    "cflujo" VARCHAR(50) NOT NULL,
    "cmodulo" VARCHAR(50) NOT NULL,
    "cproceso" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "cgrupofirmante" VARCHAR(50),
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tflujo_pkey" PRIMARY KEY ("cflujo")
);

-- CreateTable
CREATE TABLE "tfases" (
    "cfase" VARCHAR(50) NOT NULL,
    "detalle" VARCHAR(200) NOT NULL,
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tfases_pkey" PRIMARY KEY ("cfase")
);

-- CreateTable
CREATE TABLE "tflujofases" (
    "cflujo" VARCHAR(50) NOT NULL,
    "cfase" VARCHAR(50) NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tflujofases_pkey" PRIMARY KEY ("cflujo","cfase")
);

-- CreateTable
CREATE TABLE "taccion" (
    "caccion" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "tipo_accion" VARCHAR(50) NOT NULL,
    "tipo_ejecucion" "TipoEjecucion" NOT NULL DEFAULT 'MANUAL',
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "taccion_pkey" PRIMARY KEY ("caccion")
);

-- CreateTable
CREATE TABLE "tfaseaccion" (
    "cfase" VARCHAR(50) NOT NULL,
    "caccion" VARCHAR(100) NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "es_terminal" BOOLEAN NOT NULL DEFAULT false,
    "estado_final_instancia" "EstadoInstancia",
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tfaseaccion_pkey" PRIMARY KEY ("cfase","caccion")
);

-- CreateTable
CREATE TABLE "taccionresponsable" (
    "id" SERIAL NOT NULL,
    "caccion" VARCHAR(100) NOT NULL,
    "ctipo_responsable" "TipoResponsable" NOT NULL,
    "cgrupo" VARCHAR(100),
    "crol" VARCHAR(100),
    "cindividuo" VARCHAR(100),
    "codigo_resolver" VARCHAR(100),
    "tipo_asignacion" "TipoAsignacion" NOT NULL DEFAULT 'ESTATICO',
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "taccionresponsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toperacion" (
    "coperacion" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "tipo" "TipoOperacion" NOT NULL,
    "metodo_http" VARCHAR(10),
    "ruta" VARCHAR(200),
    "caccion" VARCHAR(100),
    "estado" "EstadoConfig" NOT NULL DEFAULT 'ACTIVO',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_modificacion" VARCHAR(100),
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "toperacion_pkey" PRIMARY KEY ("coperacion")
);

-- CreateTable
CREATE TABLE "tprocesoinstancia" (
    "id" SERIAL NOT NULL,
    "cmodulo" VARCHAR(50) NOT NULL,
    "cproceso" VARCHAR(50) NOT NULL,
    "cflujo" VARCHAR(50) NOT NULL,
    "cfase_actual" VARCHAR(50) NOT NULL,
    "estado" "EstadoInstancia" NOT NULL DEFAULT 'PENDIENTE',
    "tipo_entidad" VARCHAR(100),
    "id_entidad" VARCHAR(100),
    "usuario_solicitante" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tprocesoinstancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tprocesoinstanciaresponsable" (
    "id" SERIAL NOT NULL,
    "id_instancia" INTEGER NOT NULL,
    "cfase" VARCHAR(50) NOT NULL,
    "caccion" VARCHAR(100) NOT NULL,
    "cindividuo" VARCHAR(100) NOT NULL,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_atencion" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3),

    CONSTRAINT "tprocesoinstanciaresponsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tprocesoinstanciahistorial" (
    "id" SERIAL NOT NULL,
    "id_instancia" INTEGER NOT NULL,
    "fase_origen" VARCHAR(50),
    "fase_destino" VARCHAR(50) NOT NULL,
    "estado_origen" "EstadoInstancia",
    "estado_destino" "EstadoInstancia" NOT NULL,
    "usuario" VARCHAR(100) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,

    CONSTRAINT "tprocesoinstanciahistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taccionejecucion" (
    "id" SERIAL NOT NULL,
    "id_instancia" INTEGER NOT NULL,
    "cflujo" VARCHAR(50) NOT NULL,
    "cfase" VARCHAR(50) NOT NULL,
    "caccion" VARCHAR(100) NOT NULL,
    "usuario" VARCHAR(100) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),
    "estado" "EstadoEjecucion" NOT NULL DEFAULT 'EN_PROCESO',
    "mensaje" TEXT,
    "error" TEXT,
    "input_json" JSONB,
    "output_json" JSONB,

    CONSTRAINT "taccionejecucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tnotificacion" (
    "id" SERIAL NOT NULL,
    "id_instancia" INTEGER NOT NULL,
    "caccion" VARCHAR(100),
    "cindividuo" VARCHAR(100) NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL DEFAULT 'INTERNA',
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_lectura" TIMESTAMP(3),

    CONSTRAINT "tnotificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tflujo_cflujo_cmodulo_cproceso_key" ON "tflujo"("cflujo", "cmodulo", "cproceso");

-- CreateIndex
CREATE UNIQUE INDEX "tflujofases_cflujo_orden_key" ON "tflujofases"("cflujo", "orden");

-- CreateIndex
CREATE INDEX "tprocesoinstancia_usuario_solicitante_idx" ON "tprocesoinstancia"("usuario_solicitante");

-- CreateIndex
CREATE INDEX "tprocesoinstancia_cmodulo_cproceso_idx" ON "tprocesoinstancia"("cmodulo", "cproceso");

-- CreateIndex
CREATE INDEX "tprocesoinstancia_estado_idx" ON "tprocesoinstancia"("estado");

-- CreateIndex
CREATE INDEX "tprocesoinstanciaresponsable_cindividuo_estado_idx" ON "tprocesoinstanciaresponsable"("cindividuo", "estado");

-- CreateIndex
CREATE INDEX "tprocesoinstanciaresponsable_id_instancia_cfase_caccion_idx" ON "tprocesoinstanciaresponsable"("id_instancia", "cfase", "caccion");

-- CreateIndex
CREATE UNIQUE INDEX "tprocesoinstanciaresponsable_id_instancia_cfase_caccion_cin_key" ON "tprocesoinstanciaresponsable"("id_instancia", "cfase", "caccion", "cindividuo");

-- CreateIndex
CREATE INDEX "tprocesoinstanciahistorial_id_instancia_idx" ON "tprocesoinstanciahistorial"("id_instancia");

-- CreateIndex
CREATE INDEX "taccionejecucion_id_instancia_idx" ON "taccionejecucion"("id_instancia");

-- CreateIndex
CREATE INDEX "taccionejecucion_usuario_idx" ON "taccionejecucion"("usuario");

-- CreateIndex
CREATE INDEX "tnotificacion_cindividuo_estado_idx" ON "tnotificacion"("cindividuo", "estado");

-- CreateIndex
CREATE INDEX "tnotificacion_id_instancia_idx" ON "tnotificacion"("id_instancia");

-- AddForeignKey
ALTER TABLE "tproceso" ADD CONSTRAINT "tproceso_cmodulo_fkey" FOREIGN KEY ("cmodulo") REFERENCES "tmodulo"("cmodulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tflujo" ADD CONSTRAINT "tflujo_cmodulo_cproceso_fkey" FOREIGN KEY ("cmodulo", "cproceso") REFERENCES "tproceso"("cmodulo", "cproceso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tflujofases" ADD CONSTRAINT "tflujofases_cflujo_fkey" FOREIGN KEY ("cflujo") REFERENCES "tflujo"("cflujo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tflujofases" ADD CONSTRAINT "tflujofases_cfase_fkey" FOREIGN KEY ("cfase") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfaseaccion" ADD CONSTRAINT "tfaseaccion_cfase_fkey" FOREIGN KEY ("cfase") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfaseaccion" ADD CONSTRAINT "tfaseaccion_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taccionresponsable" ADD CONSTRAINT "taccionresponsable_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toperacion" ADD CONSTRAINT "toperacion_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstancia" ADD CONSTRAINT "tprocesoinstancia_cflujo_cmodulo_cproceso_fkey" FOREIGN KEY ("cflujo", "cmodulo", "cproceso") REFERENCES "tflujo"("cflujo", "cmodulo", "cproceso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstancia" ADD CONSTRAINT "tprocesoinstancia_cfase_actual_fkey" FOREIGN KEY ("cfase_actual") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciaresponsable" ADD CONSTRAINT "tprocesoinstanciaresponsable_id_instancia_fkey" FOREIGN KEY ("id_instancia") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciaresponsable" ADD CONSTRAINT "tprocesoinstanciaresponsable_cfase_fkey" FOREIGN KEY ("cfase") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciaresponsable" ADD CONSTRAINT "tprocesoinstanciaresponsable_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciahistorial" ADD CONSTRAINT "tprocesoinstanciahistorial_id_instancia_fkey" FOREIGN KEY ("id_instancia") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciahistorial" ADD CONSTRAINT "tprocesoinstanciahistorial_fase_origen_fkey" FOREIGN KEY ("fase_origen") REFERENCES "tfases"("cfase") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprocesoinstanciahistorial" ADD CONSTRAINT "tprocesoinstanciahistorial_fase_destino_fkey" FOREIGN KEY ("fase_destino") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taccionejecucion" ADD CONSTRAINT "taccionejecucion_id_instancia_fkey" FOREIGN KEY ("id_instancia") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taccionejecucion" ADD CONSTRAINT "taccionejecucion_cflujo_fkey" FOREIGN KEY ("cflujo") REFERENCES "tflujo"("cflujo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taccionejecucion" ADD CONSTRAINT "taccionejecucion_cfase_fkey" FOREIGN KEY ("cfase") REFERENCES "tfases"("cfase") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taccionejecucion" ADD CONSTRAINT "taccionejecucion_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tnotificacion" ADD CONSTRAINT "tnotificacion_id_instancia_fkey" FOREIGN KEY ("id_instancia") REFERENCES "tprocesoinstancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tnotificacion" ADD CONSTRAINT "tnotificacion_caccion_fkey" FOREIGN KEY ("caccion") REFERENCES "taccion"("caccion") ON DELETE SET NULL ON UPDATE CASCADE;
