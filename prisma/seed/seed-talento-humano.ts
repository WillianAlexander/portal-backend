import { EstadoInstancia, PrismaClient, TipoAsignacion, TipoEjecucion, TipoResponsable } from '@prisma/client';

type FaseAccionRow = {
  cfase: string;
  caccion: string;
  orden: number;
  esTerminal: boolean;
  estadoFinalInstancia: EstadoInstancia | null;
};

type ResponsableRow = {
  caccion: string;
  ctipoResponsable: TipoResponsable;
  tipoAsignacion: TipoAsignacion;
  cindividuo: string | null;
  cgrupo: string | null;
  crol: string | null;
  codigoResolver: string | null;
  prioridad: number;
};

export async function seedTalentoHumano(prisma: PrismaClient) {

  // ═══════════════════════════════════════════════════════════════════════
  // CLEANUP — elimina parametrización incorrecta de la versión anterior
  // Orden respeta dependencias FK: runtime → config → catálogos
  // ═══════════════════════════════════════════════════════════════════════

  const oldInstances = await prisma.tprocesoinstancia.findMany({
    where: { cflujo: { in: ['FLUJO_VAC'] } },
    select: { id: true },
  });
  if (oldInstances.length > 0) {
    const ids = oldInstances.map(i => i.id);
    await prisma.taccionejecucion.deleteMany({ where: { idInstancia: { in: ids } } });
    await prisma.tnotificacion.deleteMany({ where: { idInstancia: { in: ids } } });
    await prisma.tprocesoinstanciahistorial.deleteMany({ where: { idInstancia: { in: ids } } });
    await prisma.tprocesoinstanciaresponsable.deleteMany({ where: { idInstancia: { in: ids } } });
    await prisma.tsolicitudvacaciones.deleteMany({ where: { idInstanciaWorkflow: { in: ids } } });
    await prisma.tprocesoinstancia.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.tflujofases.deleteMany({ where: { cflujo: { in: ['FLUJO_VAC'] } } });
  await prisma.tfaseaccion.deleteMany({ where: { cfase: { in: ['SOLICITUD', 'APROBACION', 'FINALIZACION'] } } });
  await prisma.tflujo.deleteMany({ where: { cflujo: { in: ['FLUJO_VAC'] } } });
  await prisma.tproceso.deleteMany({ where: { cmodulo: 'TALENTO' } });
  await prisma.tmodulo.deleteMany({ where: { cmodulo: 'TALENTO' } });
  await prisma.tfases.deleteMany({ where: { cfase: { in: ['SOLICITUD', 'APROBACION', 'FINALIZACION'] } } });

  // ═══════════════════════════════════════════════════════════════════════
  // MÓDULO
  // ═══════════════════════════════════════════════════════════════════════

  await prisma.tmodulo.upsert({
    where: { cmodulo: 'TALENTO_HUMANO' },
    update: {},
    create: { cmodulo: 'TALENTO_HUMANO', descripcion: 'Sistema Integral de Talento Humano', usuarioCreacion: 'SEED' },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PROCESO — VACACIONES
  // ═══════════════════════════════════════════════════════════════════════

  await prisma.tproceso.upsert({
    where: { cmodulo_cproceso: { cmodulo: 'TALENTO_HUMANO', cproceso: 'VACACIONES' } },
    update: {},
    create: {
      cmodulo: 'TALENTO_HUMANO',
      cproceso: 'VACACIONES',
      descripcion: 'Proceso de solicitud y aprobación de vacaciones',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Flujo VACACIONES_NORMAL ─────────────────────────────────────────────

  await prisma.tflujo.upsert({
    where: { cflujo: 'VACACIONES_NORMAL' },
    update: {},
    create: {
      cflujo:      'VACACIONES_NORMAL',
      cmodulo:     'TALENTO_HUMANO',
      cproceso:    'VACACIONES',
      descripcion: 'Flujo estándar de vacaciones',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Fases — vacaciones ──────────────────────────────────────────────────
  // Prefijo VAC_ aísla estos códigos del resto de procesos

  for (const f of [
    { cfase: 'VAC_SOLICITUD',       detalle: 'Registro de solicitud de vacaciones' },
    { cfase: 'VAC_APROBACION_JEFE', detalle: 'Aprobación o rechazo por el jefe directo' },
    { cfase: 'VAC_FINALIZACION',    detalle: 'Generación de certificado de vacaciones' },
  ]) {
    await prisma.tfases.upsert({ where: { cfase: f.cfase }, update: {}, create: { ...f, usuarioCreacion: 'SEED' } });
  }

  // ── Orden de fases en VACACIONES_NORMAL ────────────────────────────────

  for (const ff of [
    { cflujo: 'VACACIONES_NORMAL', cfase: 'VAC_SOLICITUD',       orden: 1 },
    { cflujo: 'VACACIONES_NORMAL', cfase: 'VAC_APROBACION_JEFE', orden: 2 },
    { cflujo: 'VACACIONES_NORMAL', cfase: 'VAC_FINALIZACION',    orden: 3 },
  ]) {
    await prisma.tflujofases.upsert({
      where:  { cflujo_cfase: { cflujo: ff.cflujo, cfase: ff.cfase } },
      update: { orden: ff.orden },
      create: { ...ff, usuarioCreacion: 'SEED' },
    });
  }

  // ── Acciones — vacaciones ───────────────────────────────────────────────

  for (const a of [
    { caccion: 'SOLICITAR_VACACIONES', descripcion: 'Solicitar vacaciones',             tipoAccion: 'SOLICITUD',  tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'APROBAR_VACACIONES',   descripcion: 'Aprobar solicitud de vacaciones',   tipoAccion: 'APROBACION', tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'RECHAZAR_VACACIONES',  descripcion: 'Rechazar solicitud de vacaciones',  tipoAccion: 'RECHAZO',    tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'GENERAR_CERTIFICADO',  descripcion: 'Generar certificado de vacaciones', tipoAccion: 'GENERACION', tipoEjecucion: TipoEjecucion.AUTOMATICA },
  ]) {
    await prisma.taccion.upsert({ where: { caccion: a.caccion }, update: {}, create: { ...a, usuarioCreacion: 'SEED' } });
  }

  // ── Acciones por fase — vacaciones ──────────────────────────────────────

  for (const fa of [
    { cfase: 'VAC_SOLICITUD',       caccion: 'SOLICITAR_VACACIONES', orden: 1, esTerminal: false, estadoFinalInstancia: null                         },
    { cfase: 'VAC_APROBACION_JEFE', caccion: 'APROBAR_VACACIONES',   orden: 1, esTerminal: false, estadoFinalInstancia: null                         },
    { cfase: 'VAC_APROBACION_JEFE', caccion: 'RECHAZAR_VACACIONES',  orden: 2, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.RECHAZADO     },
    { cfase: 'VAC_FINALIZACION',    caccion: 'GENERAR_CERTIFICADO',  orden: 1, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.COMPLETADO    },
  ] as FaseAccionRow[]) {
    await prisma.tfaseaccion.upsert({
      where:  { cfase_caccion: { cfase: fa.cfase, caccion: fa.caccion } },
      update: { esTerminal: fa.esTerminal, estadoFinalInstancia: fa.estadoFinalInstancia },
      create: { ...fa, usuarioCreacion: 'SEED' },
    });
  }

  // ── Responsables — vacaciones ───────────────────────────────────────────

  for (const r of [
    { caccion: 'SOLICITAR_VACACIONES', codigoResolver: 'SOLICITANTE_MISMO'   },
    { caccion: 'APROBAR_VACACIONES',   codigoResolver: 'JEFE_DEL_SOLICITANTE' },
    { caccion: 'RECHAZAR_VACACIONES',  codigoResolver: 'JEFE_DEL_SOLICITANTE' },
  ] as Pick<ResponsableRow, 'caccion' | 'codigoResolver'>[]) {
    const exists = await prisma.taccionresponsable.findFirst({ where: { caccion: r.caccion, codigoResolver: r.codigoResolver } });
    if (!exists) {
      await prisma.taccionresponsable.create({
        data: {
          caccion: r.caccion,
          ctipoResponsable: TipoResponsable.INDIVIDUO,
          tipoAsignacion:   TipoAsignacion.DINAMICO,
          cindividuo: null, cgrupo: null, crol: null,
          codigoResolver: r.codigoResolver,
          prioridad: 1,
          usuarioCreacion: 'SEED',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROCESO — VIATICOS
  // ═══════════════════════════════════════════════════════════════════════

  await prisma.tproceso.upsert({
    where: { cmodulo_cproceso: { cmodulo: 'TALENTO_HUMANO', cproceso: 'VIATICOS' } },
    update: {},
    create: {
      cmodulo:     'TALENTO_HUMANO',
      cproceso:    'VIATICOS',
      descripcion: 'Proceso de solicitud de viáticos y movilización',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Flujos de viáticos ──────────────────────────────────────────────────

  for (const fl of [
    { cflujo: 'VIATICOS_ANTICIPO',    descripcion: 'Solicitud y anticipo de viáticos' },
    { cflujo: 'VIATICOS_LIQUIDACION', descripcion: 'Liquidación de viáticos' },
  ]) {
    await prisma.tflujo.upsert({
      where:  { cflujo: fl.cflujo },
      update: {},
      create: { ...fl, cmodulo: 'TALENTO_HUMANO', cproceso: 'VIATICOS', usuarioCreacion: 'SEED' },
    });
  }

  // ── Fases — viáticos ────────────────────────────────────────────────────
  // Prefijo VIA_ aísla estos códigos; fases de ANTICIPO y LIQUIDACION son independientes

  for (const f of [
    { cfase: 'VIA_SOLICITUD',        detalle: 'Registro de solicitud de anticipo de viáticos' },
    { cfase: 'VIA_APROBACION_JEFE',  detalle: 'Aprobación o rechazo del anticipo por el jefe directo' },
    { cfase: 'VIA_CIERRE_ANTICIPO',  detalle: 'Generación de orden de pago del anticipo de viáticos' },
    { cfase: 'VIA_PRESENTACION_LIQ', detalle: 'Presentación de liquidación de viáticos' },
    { cfase: 'VIA_REVISION_LIQ',     detalle: 'Revisión y aprobación de la liquidación' },
    { cfase: 'VIA_CIERRE_LIQ',       detalle: 'Cierre y archivo de liquidación de viáticos' },
  ]) {
    await prisma.tfases.upsert({ where: { cfase: f.cfase }, update: {}, create: { ...f, usuarioCreacion: 'SEED' } });
  }

  // ── Orden de fases por flujo ────────────────────────────────────────────

  for (const ff of [
    { cflujo: 'VIATICOS_ANTICIPO',    cfase: 'VIA_SOLICITUD',        orden: 1 },
    { cflujo: 'VIATICOS_ANTICIPO',    cfase: 'VIA_APROBACION_JEFE',  orden: 2 },
    { cflujo: 'VIATICOS_ANTICIPO',    cfase: 'VIA_CIERRE_ANTICIPO',  orden: 3 },
    { cflujo: 'VIATICOS_LIQUIDACION', cfase: 'VIA_PRESENTACION_LIQ', orden: 1 },
    { cflujo: 'VIATICOS_LIQUIDACION', cfase: 'VIA_REVISION_LIQ',     orden: 2 },
    { cflujo: 'VIATICOS_LIQUIDACION', cfase: 'VIA_CIERRE_LIQ',       orden: 3 },
  ]) {
    await prisma.tflujofases.upsert({
      where:  { cflujo_cfase: { cflujo: ff.cflujo, cfase: ff.cfase } },
      update: { orden: ff.orden },
      create: { ...ff, usuarioCreacion: 'SEED' },
    });
  }

  // ── Acciones — viáticos ─────────────────────────────────────────────────

  for (const a of [
    { caccion: 'SOLICITAR_ANTICIPO_VIA',    descripcion: 'Solicitar anticipo de viáticos',             tipoAccion: 'SOLICITUD',  tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'APROBAR_ANTICIPO_VIA',      descripcion: 'Aprobar anticipo de viáticos',               tipoAccion: 'APROBACION', tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'RECHAZAR_ANTICIPO_VIA',     descripcion: 'Rechazar anticipo de viáticos',              tipoAccion: 'RECHAZO',    tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'GENERAR_ORDEN_PAGO_VIA',    descripcion: 'Generar orden de pago de viáticos',          tipoAccion: 'GENERACION', tipoEjecucion: TipoEjecucion.AUTOMATICA },
    { caccion: 'PRESENTAR_LIQUIDACION_VIA', descripcion: 'Presentar liquidación de viáticos',          tipoAccion: 'SOLICITUD',  tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'APROBAR_LIQUIDACION_VIA',   descripcion: 'Aprobar liquidación de viáticos',            tipoAccion: 'APROBACION', tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'RECHAZAR_LIQUIDACION_VIA',  descripcion: 'Rechazar liquidación de viáticos',           tipoAccion: 'RECHAZO',    tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'CERRAR_LIQUIDACION_VIA',    descripcion: 'Cerrar y archivar liquidación de viáticos',  tipoAccion: 'GENERACION', tipoEjecucion: TipoEjecucion.AUTOMATICA },
  ]) {
    await prisma.taccion.upsert({ where: { caccion: a.caccion }, update: {}, create: { ...a, usuarioCreacion: 'SEED' } });
  }

  // ── Acciones por fase — viáticos ────────────────────────────────────────

  for (const fa of [
    { cfase: 'VIA_SOLICITUD',        caccion: 'SOLICITAR_ANTICIPO_VIA',    orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'VIA_APROBACION_JEFE',  caccion: 'APROBAR_ANTICIPO_VIA',      orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'VIA_APROBACION_JEFE',  caccion: 'RECHAZAR_ANTICIPO_VIA',     orden: 2, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.RECHAZADO  },
    { cfase: 'VIA_CIERRE_ANTICIPO',  caccion: 'GENERAR_ORDEN_PAGO_VIA',    orden: 1, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.COMPLETADO },
    { cfase: 'VIA_PRESENTACION_LIQ', caccion: 'PRESENTAR_LIQUIDACION_VIA', orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'VIA_REVISION_LIQ',     caccion: 'APROBAR_LIQUIDACION_VIA',   orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'VIA_REVISION_LIQ',     caccion: 'RECHAZAR_LIQUIDACION_VIA',  orden: 2, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.RECHAZADO  },
    { cfase: 'VIA_CIERRE_LIQ',       caccion: 'CERRAR_LIQUIDACION_VIA',    orden: 1, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.COMPLETADO },
  ] as FaseAccionRow[]) {
    await prisma.tfaseaccion.upsert({
      where:  { cfase_caccion: { cfase: fa.cfase, caccion: fa.caccion } },
      update: { esTerminal: fa.esTerminal, estadoFinalInstancia: fa.estadoFinalInstancia },
      create: { ...fa, usuarioCreacion: 'SEED' },
    });
  }

  // ── Responsables — viáticos ─────────────────────────────────────────────

  for (const r of [
    { caccion: 'SOLICITAR_ANTICIPO_VIA',    codigoResolver: 'SOLICITANTE_MISMO'    },
    { caccion: 'APROBAR_ANTICIPO_VIA',      codigoResolver: 'JEFE_DEL_SOLICITANTE' },
    { caccion: 'RECHAZAR_ANTICIPO_VIA',     codigoResolver: 'JEFE_DEL_SOLICITANTE' },
    { caccion: 'PRESENTAR_LIQUIDACION_VIA', codigoResolver: 'SOLICITANTE_MISMO'    },
    { caccion: 'APROBAR_LIQUIDACION_VIA',   codigoResolver: 'JEFE_DEL_SOLICITANTE' },
    { caccion: 'RECHAZAR_LIQUIDACION_VIA',  codigoResolver: 'JEFE_DEL_SOLICITANTE' },
  ] as Pick<ResponsableRow, 'caccion' | 'codigoResolver'>[]) {
    const exists = await prisma.taccionresponsable.findFirst({ where: { caccion: r.caccion, codigoResolver: r.codigoResolver } });
    if (!exists) {
      await prisma.taccionresponsable.create({
        data: {
          caccion: r.caccion,
          ctipoResponsable: TipoResponsable.INDIVIDUO,
          tipoAsignacion:   TipoAsignacion.DINAMICO,
          cindividuo: null, cgrupo: null, crol: null,
          codigoResolver: r.codigoResolver,
          prioridad: 1,
          usuarioCreacion: 'SEED',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROCESO — PERMISOS
  // ═══════════════════════════════════════════════════════════════════════

  await prisma.tproceso.upsert({
    where: { cmodulo_cproceso: { cmodulo: 'TALENTO_HUMANO', cproceso: 'PERMISOS' } },
    update: {},
    create: {
      cmodulo:     'TALENTO_HUMANO',
      cproceso:    'PERMISOS',
      descripcion: 'Proceso de solicitud y aprobación de permisos',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Flujo PERMISOS_NORMAL ───────────────────────────────────────────────

  await prisma.tflujo.upsert({
    where:  { cflujo: 'PERMISOS_NORMAL' },
    update: {},
    create: {
      cflujo:      'PERMISOS_NORMAL',
      cmodulo:     'TALENTO_HUMANO',
      cproceso:    'PERMISOS',
      descripcion: 'Flujo estándar de permisos',
      usuarioCreacion: 'SEED',
    },
  });

  // ── Fases — permisos ────────────────────────────────────────────────────

  for (const f of [
    { cfase: 'PER_SOLICITUD',       detalle: 'Registro de solicitud de permiso' },
    { cfase: 'PER_APROBACION_JEFE', detalle: 'Aprobación o rechazo del permiso por el jefe directo' },
    { cfase: 'PER_FINALIZACION',    detalle: 'Finalización y registro del permiso aprobado' },
  ]) {
    await prisma.tfases.upsert({ where: { cfase: f.cfase }, update: {}, create: { ...f, usuarioCreacion: 'SEED' } });
  }

  // ── Orden de fases en PERMISOS_NORMAL ──────────────────────────────────

  for (const ff of [
    { cflujo: 'PERMISOS_NORMAL', cfase: 'PER_SOLICITUD',       orden: 1 },
    { cflujo: 'PERMISOS_NORMAL', cfase: 'PER_APROBACION_JEFE', orden: 2 },
    { cflujo: 'PERMISOS_NORMAL', cfase: 'PER_FINALIZACION',    orden: 3 },
  ]) {
    await prisma.tflujofases.upsert({
      where:  { cflujo_cfase: { cflujo: ff.cflujo, cfase: ff.cfase } },
      update: { orden: ff.orden },
      create: { ...ff, usuarioCreacion: 'SEED' },
    });
  }

  // ── Acciones — permisos ─────────────────────────────────────────────────

  for (const a of [
    { caccion: 'SOLICITAR_PERMISO', descripcion: 'Solicitar permiso',             tipoAccion: 'SOLICITUD',  tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'APROBAR_PERMISO',   descripcion: 'Aprobar solicitud de permiso',  tipoAccion: 'APROBACION', tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'RECHAZAR_PERMISO',  descripcion: 'Rechazar solicitud de permiso', tipoAccion: 'RECHAZO',    tipoEjecucion: TipoEjecucion.MANUAL    },
    { caccion: 'FINALIZAR_PERMISO', descripcion: 'Finalizar y registrar permiso', tipoAccion: 'GENERACION', tipoEjecucion: TipoEjecucion.AUTOMATICA },
  ]) {
    await prisma.taccion.upsert({ where: { caccion: a.caccion }, update: {}, create: { ...a, usuarioCreacion: 'SEED' } });
  }

  // ── Acciones por fase — permisos ────────────────────────────────────────

  for (const fa of [
    { cfase: 'PER_SOLICITUD',       caccion: 'SOLICITAR_PERMISO', orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'PER_APROBACION_JEFE', caccion: 'APROBAR_PERMISO',   orden: 1, esTerminal: false, estadoFinalInstancia: null                      },
    { cfase: 'PER_APROBACION_JEFE', caccion: 'RECHAZAR_PERMISO',  orden: 2, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.RECHAZADO  },
    { cfase: 'PER_FINALIZACION',    caccion: 'FINALIZAR_PERMISO', orden: 1, esTerminal: true,  estadoFinalInstancia: EstadoInstancia.COMPLETADO },
  ] as FaseAccionRow[]) {
    await prisma.tfaseaccion.upsert({
      where:  { cfase_caccion: { cfase: fa.cfase, caccion: fa.caccion } },
      update: { esTerminal: fa.esTerminal, estadoFinalInstancia: fa.estadoFinalInstancia },
      create: { ...fa, usuarioCreacion: 'SEED' },
    });
  }

  // ── Responsables — permisos ─────────────────────────────────────────────

  for (const r of [
    { caccion: 'SOLICITAR_PERMISO', codigoResolver: 'SOLICITANTE_MISMO'    },
    { caccion: 'APROBAR_PERMISO',   codigoResolver: 'JEFE_DEL_SOLICITANTE' },
    { caccion: 'RECHAZAR_PERMISO',  codigoResolver: 'JEFE_DEL_SOLICITANTE' },
  ] as Pick<ResponsableRow, 'caccion' | 'codigoResolver'>[]) {
    const exists = await prisma.taccionresponsable.findFirst({ where: { caccion: r.caccion, codigoResolver: r.codigoResolver } });
    if (!exists) {
      await prisma.taccionresponsable.create({
        data: {
          caccion: r.caccion,
          ctipoResponsable: TipoResponsable.INDIVIDUO,
          tipoAsignacion:   TipoAsignacion.DINAMICO,
          cindividuo: null, cgrupo: null, crol: null,
          codigoResolver: r.codigoResolver,
          prioridad: 1,
          usuarioCreacion: 'SEED',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EMPLEADOS Y JEFES — datos de prueba
  // ═══════════════════════════════════════════════════════════════════════

  for (const je of [
    { cempleado: 'user01',  cjefe: 'jefe01' },
    { cempleado: 'user02',  cjefe: 'jefe01' },
    { cempleado: 'user03',  cjefe: 'jefe02' },
    { cempleado: 'dev-wla', cjefe: 'jefe01' },
  ]) {
    await prisma.tjefeempleado.upsert({
      where:  { cempleado: je.cempleado },
      update: { cjefe: je.cjefe },
      create: je,
    });
  }

  console.log('  ✓ TALENTO_HUMANO sembrado: módulo, vacaciones (VACACIONES_NORMAL), viáticos (VIATICOS_ANTICIPO + VIATICOS_LIQUIDACION), permisos (PERMISOS_NORMAL)');
}
