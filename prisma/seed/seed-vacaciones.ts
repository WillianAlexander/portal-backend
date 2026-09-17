import { EstadoInstancia, PrismaClient, TipoAsignacion, TipoEjecucion, TipoResponsable } from '@prisma/client';

export async function seedVacaciones(prisma: PrismaClient) {
  // ── Módulo ──────────────────────────────────────────────────
  await prisma.tmodulo.upsert({
    where: { cmodulo: 'TALENTO' },
    update: {},
    create: { cmodulo: 'TALENTO', descripcion: 'Módulo de Talento Humano', usuarioCreacion: 'SEED' },
  });

  // ── Proceso ─────────────────────────────────────────────────
  await prisma.tproceso.upsert({
    where: { cmodulo_cproceso: { cmodulo: 'TALENTO', cproceso: 'VACACIONES' } },
    update: {},
    create: {
      cmodulo: 'TALENTO',
      cproceso: 'VACACIONES',
      descripcion: 'Proceso de solicitud y aprobación de vacaciones',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Flujo ────────────────────────────────────────────────────
  await prisma.tflujo.upsert({
    where: { cflujo: 'FLUJO_VAC' },
    update: {},
    create: {
      cflujo: 'FLUJO_VAC',
      cmodulo: 'TALENTO',
      cproceso: 'VACACIONES',
      descripcion: 'Flujo estándar de vacaciones',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Fases del catálogo (Tfases.detalle) ─────────────────────
  const fases = [
    { cfase: 'SOLICITUD', detalle: 'Registro de solicitud de vacaciones' },
    { cfase: 'APROBACION', detalle: 'Aprobación o rechazo por el jefe directo' },
    { cfase: 'FINALIZACION', detalle: 'Generación de certificado de vacaciones' },
  ];
  for (const f of fases) {
    await prisma.tfases.upsert({
      where: { cfase: f.cfase },
      update: {},
      create: { ...f, usuarioCreacion: 'SEED' },
    });
  }

  // ── Fases del flujo (orden) ──────────────────────────────────
  const flujofases = [
    { cflujo: 'FLUJO_VAC', cfase: 'SOLICITUD', orden: 1 },
    { cflujo: 'FLUJO_VAC', cfase: 'APROBACION', orden: 2 },
    { cflujo: 'FLUJO_VAC', cfase: 'FINALIZACION', orden: 3 },
  ];
  for (const ff of flujofases) {
    await prisma.tflujofases.upsert({
      where: { cflujo_cfase: { cflujo: ff.cflujo, cfase: ff.cfase } },
      update: { orden: ff.orden },
      create: { ...ff, usuarioCreacion: 'SEED' },
    });
  }

  // ── Acciones del catálogo (Taccion) ──────────────────────────
  const acciones: Array<{
    caccion: string;
    descripcion: string;
    tipoAccion: string;
    tipoEjecucion: TipoEjecucion;
  }> = [
    { caccion: 'SOLICITAR_VACACIONES', descripcion: 'Solicitar vacaciones', tipoAccion: 'SOLICITUD', tipoEjecucion: TipoEjecucion.MANUAL },
    { caccion: 'APROBAR_VACACIONES', descripcion: 'Aprobar solicitud de vacaciones', tipoAccion: 'APROBACION', tipoEjecucion: TipoEjecucion.MANUAL },
    { caccion: 'RECHAZAR_VACACIONES', descripcion: 'Rechazar solicitud de vacaciones', tipoAccion: 'RECHAZO', tipoEjecucion: TipoEjecucion.MANUAL },
    { caccion: 'GENERAR_CERTIFICADO', descripcion: 'Generar certificado de vacaciones', tipoAccion: 'GENERACION', tipoEjecucion: TipoEjecucion.AUTOMATICA },
  ];
  for (const a of acciones) {
    await prisma.taccion.upsert({
      where: { caccion: a.caccion },
      update: {},
      create: { ...a, usuarioCreacion: 'SEED' },
    });
  }

  // ── Acciones por fase (Tfaseaccion — PK: cfase + caccion) ────
  const faseAcciones: Array<{
    cfase: string;
    caccion: string;
    orden: number;
    esTerminal: boolean;
    estadoFinalInstancia: EstadoInstancia | null;
  }> = [
    { cfase: 'SOLICITUD', caccion: 'SOLICITAR_VACACIONES', orden: 1, esTerminal: false, estadoFinalInstancia: null },
    { cfase: 'APROBACION', caccion: 'APROBAR_VACACIONES', orden: 1, esTerminal: false, estadoFinalInstancia: null },
    { cfase: 'APROBACION', caccion: 'RECHAZAR_VACACIONES', orden: 2, esTerminal: true, estadoFinalInstancia: EstadoInstancia.RECHAZADO },
    { cfase: 'FINALIZACION', caccion: 'GENERAR_CERTIFICADO', orden: 1, esTerminal: true, estadoFinalInstancia: EstadoInstancia.COMPLETADO },
  ];
  for (const fa of faseAcciones) {
    await prisma.tfaseaccion.upsert({
      where: { cfase_caccion: { cfase: fa.cfase, caccion: fa.caccion } },
      update: { esTerminal: fa.esTerminal, estadoFinalInstancia: fa.estadoFinalInstancia },
      create: { ...fa, usuarioCreacion: 'SEED' },
    });
  }

  // ── Responsables por acción (Taccionresponsable — sin UK compuesto) ──
  const responsables: Array<{
    caccion: string;
    ctipoResponsable: TipoResponsable;
    tipoAsignacion: TipoAsignacion;
    cindividuo: string | null;
    cgrupo: string | null;
    crol: string | null;
    codigoResolver: string | null;
    prioridad: number;
  }> = [
    {
      caccion: 'SOLICITAR_VACACIONES',
      ctipoResponsable: TipoResponsable.INDIVIDUO,
      tipoAsignacion: TipoAsignacion.DINAMICO,
      cindividuo: null, cgrupo: null, crol: null,
      codigoResolver: 'SOLICITANTE_MISMO',
      prioridad: 1,
    },
    {
      caccion: 'APROBAR_VACACIONES',
      ctipoResponsable: TipoResponsable.INDIVIDUO,
      tipoAsignacion: TipoAsignacion.DINAMICO,
      cindividuo: null, cgrupo: null, crol: null,
      codigoResolver: 'JEFE_DEL_SOLICITANTE',
      prioridad: 1,
    },
    {
      caccion: 'RECHAZAR_VACACIONES',
      ctipoResponsable: TipoResponsable.INDIVIDUO,
      tipoAsignacion: TipoAsignacion.DINAMICO,
      cindividuo: null, cgrupo: null, crol: null,
      codigoResolver: 'JEFE_DEL_SOLICITANTE',
      prioridad: 1,
    },
  ];
  for (const r of responsables) {
    const existing = await prisma.taccionresponsable.findFirst({
      where: { caccion: r.caccion, codigoResolver: r.codigoResolver },
    });
    if (!existing) {
      await prisma.taccionresponsable.create({ data: { ...r, usuarioCreacion: 'SEED' } });
    }
  }

  // ── Empleados y sus jefes (datos de prueba) ──────────────────
  const jefeEmpleados = [
    { cempleado: 'user01', cjefe: 'jefe01' },
    { cempleado: 'user02', cjefe: 'jefe01' },
    { cempleado: 'user03', cjefe: 'jefe02' },
  ];
  for (const je of jefeEmpleados) {
    await prisma.tjefeempleado.upsert({
      where: { cempleado: je.cempleado },
      update: { cjefe: je.cjefe },
      create: je,
    });
  }

  console.log('Seed vacaciones completado');
}
