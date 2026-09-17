-- CreateTable
CREATE TABLE "tusuario" (
    "cempleado" VARCHAR(100) NOT NULL,
    "cedula" VARCHAR(20) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "cargo" VARCHAR(100),
    "departamento" VARCHAR(100),
    "email" VARCHAR(200),
    "agencia" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "tusuario_pkey" PRIMARY KEY ("cempleado")
);

-- CreateIndex
CREATE UNIQUE INDEX "tusuario_cedula_key" ON "tusuario"("cedula");
