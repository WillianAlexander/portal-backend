# Motor configurable de procesos y workflows
## Sistema Integral de Talento Humano

## 1. Objetivo

Construir un motor de procesos/workflows configurable para un sistema de Talento Humano utilizando:

- Backend: NestJS + TypeScript
- ORM: Prisma
- Base de datos: PostgreSQL
- API: REST
- Arquitectura modular y escalable

El objetivo es que los procesos puedan configurarse mediante base de datos sin tener que modificar el motor cada vez que se cree un nuevo proceso, flujo, fase o acción.

La regla fundamental es:

> **La base de datos define QUÉ debe ocurrir. El código define CÓMO ocurre.**

La configuración del workflow debe estar desacoplada de la lógica de negocio.

---

# 2. Principio arquitectónico

El sistema debe separar claramente:

### Configuración

Define los procesos disponibles y sus reglas.

```text
TMODULO
   ↓
TPROCESO
   ↓
TFLUJO
   ↓
TFLUJOFASES
   ↓
TFASES
   ↓
TFASEACCION
   ↓
TACCION
   ↓
TACCIONRESPONSABLE
```

### Ejecución

Representa procesos reales ejecutándose.

```text
TPROCESOINSTANCIA
   ↓
TPROCESOINSTANCIARESPONSABLE
   ↓
TACCIONEJECUCION
   ↓
TPROCESOINSTANCIAHISTORIAL
   ↓
TNOTIFICACION
```

No mezclar configuración con ejecución.

---

# 3. Módulo

La agrupación superior del sistema será **MÓDULO**.

No utilizar "Sistema" como nivel superior.

Ejemplos:

```text
TALENTO_HUMANO
CONTABILIDAD
TESORERIA
SEGURIDAD
```

Un módulo contiene procesos.

---

# 4. TMODULO

Catálogo de módulos funcionales.

Ejemplo:

```text
CMODULO: TALENTO_HUMANO
DESCRIPCION: Gestión de Talento Humano
ESTADO: ACTIVO
```

Campos recomendados:

```text
CMODULO
DESCRIPCION
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

Debe existir control de vigencia e historial.

No eliminar físicamente configuraciones históricas que puedan ser necesarias para reconstruir ejecuciones antiguas.

---

# 5. TPROCESO

Representa un proceso funcional dentro de un módulo.

Ejemplos:

```text
TALENTO_HUMANO
    ├── VACACIONES
    ├── PERMISOS
    ├── CERTIFICADOS
    └── CONTRATACION
```

Campos:

```text
CMODULO
CPROCESO
DESCRIPCION
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

La relación lógica es:

```text
TMODULO 1 ─── N TPROCESO
```

Se recomienda una clave compuesta:

```text
(CMODULO, CPROCESO)
```

---

# 6. TFLUJO

Un proceso puede tener diferentes variantes o flujos.

Ejemplo:

```text
VACACIONES
    ├── VACACIONES_NORMAL
    ├── VACACIONES_EMERGENCIA
    └── VACACIONES_ESPECIAL
```

Campos:

```text
CFLUJO
CMODULO
CPROCESO
DESCRIPCION
CGRUPOFIRMANTE
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

El flujo pertenece a un proceso.

No guardar nombres de clases TypeScript ni rutas de archivos en esta tabla.

---

# 7. TFASES

Catálogo reutilizable de fases.

Ejemplos:

```text
SOLICITUD
APROBACION
REVISION
FINALIZACION
RECHAZADO
```

Campos:

```text
CFASE
DETALLE
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

Una fase es reutilizable.

Por ejemplo:

```text
APROBACION
```

puede ser utilizada por:

```text
VACACIONES
PERMISOS
SOLICITUDES
```

---

# 8. TFLUJOFASES

Relaciona un flujo con sus fases y define el orden.

Ejemplo:

```text
VACACIONES_NORMAL

1 → SOLICITUD
2 → APROBACION
3 → FINALIZACION
```

Campos:

```text
CFLUJO
CFASE
ORDEN
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

Regla:

```text
UN FLUJO
    ↓
MUCHAS FASES
    ↓
CADA FASE TIENE UN ORDEN
```

Debe existir una restricción para impedir dos fases con el mismo `ORDEN` dentro del mismo flujo.

Ejemplo:

```text
UNIQUE(CFLUJO, ORDEN)
```

---

# 9. TACCION

Catálogo reutilizable de acciones.

Ejemplos:

```text
SOLICITAR_VACACIONES
APROBAR_VACACIONES
RECHAZAR_VACACIONES
VALIDAR_DOCUMENTACION
GENERAR_CERTIFICADO
ENVIAR_NOTIFICACION
REGISTRAR_SOLICITUD
```

Campos:

```text
CACCION
DESCRIPCION
TIPO_ACCION
TIPO_EJECUCION
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

`TIPO_ACCION` puede representar conceptos como:

```text
SOLICITUD
APROBACION
RECHAZO
REGISTRO
FIRMA
CONSULTA
NOTIFICACION
GENERACION
VALIDACION
```

`TIPO_EJECUCION`:

```text
MANUAL
AUTOMATICA
```

Ejemplo:

```text
APROBAR_VACACIONES
TIPO_ACCION = APROBACION
TIPO_EJECUCION = MANUAL
```

```text
GENERAR_CERTIFICADO
TIPO_ACCION = GENERACION
TIPO_EJECUCION = AUTOMATICA
```

---

# 10. TFASEACCION

Relaciona las acciones disponibles con una fase.

Ejemplo:

```text
APROBACION
    ├── APROBAR_VACACIONES
    └── RECHAZAR_VACACIONES
```

Campos:

```text
CFASE
CACCION
ORDEN
OBLIGATORIO
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

Debe existir:

```text
UNIQUE(CFASE, CACCION)
```

La fase determina qué acciones están disponibles.

---

# 11. TACCIONRESPONSABLE

Esta tabla determina quién puede ejecutar cada acción.

No crear una tabla `TFASERESPONSABLE`.

La responsabilidad se obtiene a través de:

```text
TFASE
   ↓
TFASEACCION
   ↓
TACCION
   ↓
TACCIONRESPONSABLE
```

Ejemplo:

```text
APROBACION
    ↓
APROBAR_VACACIONES
    ↓
JEFE_DEL_SOLICITANTE
```

Campos:

```text
CACCION
CTIPO_RESPONSABLE
CGRUPO
CROL
CINDIVIDUO
TIPO_ASIGNACION
PRIORIDAD
ESTADO
FECHA_INICIO
FECHA_FIN
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
```

`CTIPO_RESPONSABLE`:

```text
GRUPO
ROL
INDIVIDUO
```

`TIPO_ASIGNACION`:

```text
ESTATICO
DINAMICO
```

Ejemplos:

### Responsable estático

```text
GENERAR_CERTIFICADO
    ↓
GRUPO = RRHH
```

Todos los usuarios autorizados del grupo pueden recibir la tarea.

### Responsable dinámico

```text
APROBAR_VACACIONES
    ↓
JEFE_DEL_SOLICITANTE
```

Si:

```text
Alexander → Carlos
```

entonces para una instancia iniciada por Alexander:

```text
Responsable concreto = Carlos
```

No guardar nombres de clases o paths en la base de datos.

La configuración debe guardar códigos funcionales.

---

# 12. Múltiples responsables

Una misma acción puede tener dos o más responsables.

Ejemplo:

```text
APROBAR_VACACIONES
        │
        ├── Carlos
        ├── María
        └── Juan
```

Los tres pueden recibir la misma instancia/tarea.

No duplicar `TPROCESOINSTANCIA`.

Debe existir una única instancia:

```text
Solicitud #123
Fase: APROBACION
```

y múltiples asignaciones:

```text
Carlos → PENDIENTE
María  → PENDIENTE
Juan   → PENDIENTE
```

---

# 13. TPROCESOINSTANCIA

Representa una ejecución real de un proceso.

Ejemplo:

```text
Instancia #000123

Proceso:
VACACIONES

Flujo:
VACACIONES_NORMAL

Fase actual:
APROBACION

Solicitante:
Alexander

Estado:
EN_PROCESO
```

Campos conceptuales:

```text
ID
CMODULO
CPROCESO
CFLUJO
CFASE_ACTUAL
ESTADO
TIPO_ENTIDAD
ID_ENTIDAD
USUARIO_SOLICITANTE
FECHA_INICIO
FECHA_FIN
FECHA_CREACION
FECHA_MODIFICACION
```

Estados de ejecución:

```text
PENDIENTE
EN_PROCESO
COMPLETADO
RECHAZADO
CANCELADO
```

No confundir estos estados con `ACTIVO/INACTIVO` de configuración.

---

# 14. TPROCESOINSTANCIARESPONSABLE

Representa el resultado concreto de resolver los responsables de una instancia.

Esta tabla es importante para soportar:

- múltiples responsables
- asignaciones dinámicas
- historial de responsables
- seguimiento de quién recibió una tarea
- quién la atendió
- quién quedó pendiente
- quién fue reemplazado/cancelado

Campos:

```text
ID
ID_INSTANCIA
CACCION
CINDIVIDUO
ESTADO
FECHA_ASIGNACION
FECHA_ATENCION
FECHA_VENCIMIENTO
```

Ejemplo:

```text
INSTANCIA 123
FASE APROBACION

APROBAR_VACACIONES

Carlos → PENDIENTE
María  → PENDIENTE
Juan   → PENDIENTE
```

Cuando Carlos ejecuta la acción:

```text
Carlos → ATENDIDA
María  → CANCELADA
Juan   → CANCELADA
```

Esto evita que los otros responsables ejecuten posteriormente una acción que ya fue procesada.

---

# 15. TACCIONEJECUCION

Audita cada ejecución de acción.

Debe registrar:

```text
ID
ID_INSTANCIA
CFLUJO
CFASE
CACCION
USUARIO
FECHA_INICIO
FECHA_FIN
ESTADO
MENSAJE
ERROR
INPUT_JSON
OUTPUT_JSON
```

`INPUT_JSON` y `OUTPUT_JSON` pueden ser JSONB.

Sirve para:

- auditoría
- trazabilidad
- debugging
- historial
- análisis de errores

---

# 16. TPROCESOINSTANCIAHISTORIAL

Registra los cambios importantes de la instancia.

Ejemplo:

```text
SOLICITUD
    ↓
APROBACION
    ↓
FINALIZACION
    ↓
COMPLETADO
```

Registrar:

```text
ID
ID_INSTANCIA
FASE_ORIGEN
FASE_DESTINO
ESTADO_ORIGEN
ESTADO_DESTINO
USUARIO
FECHA
OBSERVACION
```

También puede registrar cambios de responsable.

---

# 17. TNOTIFICACION

Las notificaciones deben ser independientes del motor de workflow.

Ejemplo:

```text
Instancia #123
    ↓
APROBACION
    ↓
Responsables:
Carlos
María
Juan
```

Se generan notificaciones individuales.

Campos:

```text
ID
ID_INSTANCIA
CACCION
CINDIVIDUO
TIPO
TITULO
MENSAJE
ESTADO
FECHA_CREACION
FECHA_LECTURA
```

Estados posibles:

```text
PENDIENTE
LEIDA
PROCESADA
CANCELADA
```

Tipos:

```text
INTERNA
EMAIL
PUSH
```

El motor debe poder trabajar inicialmente solo con notificación interna y posteriormente agregar otros canales.

---

# 18. TOPERACION

Representa operaciones expuestas por la aplicación.

No todas las operaciones HTTP son workflows.

Ejemplos:

```text
LISTAR_DEPARTAMENTOS
GET /catalogos/departamentos
TIPO = QUERY
```

```text
SOLICITAR_VACACIONES
POST /vacaciones/solicitar
TIPO = WORKFLOW
```

```text
APROBAR_VACACIONES
POST /vacaciones/aprobar
TIPO = WORKFLOW
```

Tipos:

```text
QUERY
COMMAND
WORKFLOW
```

Campos:

```text
COPERACION
DESCRIPCION
TIPO
METODO_HTTP
RUTA
CACCION
ESTADO
```

Una operación de workflow puede asociarse a una acción.

---

# 19. No generar endpoints dinámicamente

Aunque `TOPERACION` almacene:

```text
POST /vacaciones/aprobar
```

los endpoints reales deben permanecer definidos en código NestJS.

No crear controllers/routes dinámicamente desde la base de datos.

Esto permite conservar:

- Swagger
- DTOs
- validaciones
- Guards
- decorators
- seguridad
- tipado
- debugging
- control del código

La BD sirve como configuración y metadata, no como sustituto de NestJS.

---

# 20. API

Separar APIs de consulta y APIs de comandos/workflow.

## Queries

Ejemplo:

```http
GET /api/catalogos/departamentos
GET /api/catalogos/cargos
GET /api/catalogos/tipos-contrato
GET /api/empleados
GET /api/vacaciones/123
```

Flujo:

```text
Frontend
   ↓
Controller
   ↓
Service
   ↓
Prisma
```

No deben pasar por el Workflow Engine.

---

# 21. Workflow APIs

Ejemplos:

```http
POST /api/vacaciones/solicitar
POST /api/vacaciones/aprobar
POST /api/vacaciones/rechazar
```

Flujo:

```text
Frontend
   ↓
Controller
   ↓
WorkflowExecutionService
   ↓
Workflow Engine
   ↓
Action
   ↓
ActionHandler
   ↓
Domain Service
   ↓
Prisma
```

No utilizar un endpoint genérico como:

```http
POST /vacaciones/procesar
```

con:

```json
{
  "accion": "APROBAR"
}
```

Es preferible tener operaciones explícitas:

```text
POST /vacaciones/solicitar
POST /vacaciones/aprobar
POST /vacaciones/rechazar
```

---

# 22. Bandeja de tareas

Endpoint:

```http
GET /workflow/tasks
```

Significa:

> Obtener las tareas que el usuario autenticado puede procesar actualmente.

Ejemplo:

```json
{
  "items": [
    {
      "instanceId": "000123",
      "process": "VACACIONES",
      "description": "Solicitud de vacaciones de Alexander",
      "currentPhase": "APROBACION",
      "availableActions": [
        {
          "code": "APROBAR_VACACIONES",
          "description": "Aprobar"
        },
        {
          "code": "RECHAZAR_VACACIONES",
          "description": "Rechazar"
        }
      ]
    }
  ]
}
```

El frontend solamente consume esta información.

No necesita conocer:

```text
TFASEACCION
TACCIONRESPONSABLE
TFLUJOFASES
```

---

# 23. Mis procesos

Endpoint:

```http
GET /workflow/my-processes
```

Representa procesos iniciados por el usuario.

Es diferente de:

```http
GET /workflow/tasks
```

Porque:

```text
/tasks
```

significa:

> cosas que puedo procesar.

Mientras:

```text
/my-processes
```

significa:

> cosas que yo inicié o solicité.

---

# 24. Seguridad

Nunca confiar en el frontend.

Ocultar un botón no constituye autorización.

Cuando un usuario ejecuta:

```http
POST /workflow/instances/000123/actions/APROBAR_VACACIONES
```

el backend debe validar:

```text
1. Usuario autenticado
2. Instancia existe
3. Instancia está activa
4. Fase actual es correcta
5. Acción pertenece a la fase
6. Acción está activa
7. Usuario es responsable autorizado
8. Resolver/revalidar responsabilidad
9. Ejecutar handler
10. Registrar ejecución
11. Avanzar workflow
```

Si no está autorizado:

```http
403 Forbidden
```

---

# 25. Workflow Engine

El Workflow Engine debe ser genérico.

No debe contener lógica específica de vacaciones, certificados, permisos, etc.

Incorrecto:

```typescript
switch (actionCode) {
  case 'APROBAR_VACACIONES':
    ...
  case 'GENERAR_CERTIFICADO':
    ...
}
```

Correcto:

```text
Workflow Engine
      ↓
ActionHandlerRegistry
      ↓
Handler correspondiente
```

La BD determina el código:

```text
GENERAR_CERTIFICADO
```

El código determina qué clase ejecutarlo.

---

# 26. ActionHandler

Crear una interfaz:

```typescript
export interface ActionContext {
  procesoCodigo: string;
  flujoCodigo: string;
  faseCodigo: string;
  accionCodigo: string;
  usuarioId: string;
  entidadId?: string;
  data?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface ActionHandler {
  readonly code: string;

  execute(
    context: ActionContext,
  ): Promise<ActionResult>;
}
```

Ejemplo:

```typescript
@Injectable()
export class GenerarCertificadoHandler
  implements ActionHandler {

  readonly code = 'GENERAR_CERTIFICADO';

  constructor(
    private readonly certificadoService: CertificadoService,
  ) {}

  async execute(
    context: ActionContext,
  ): Promise<ActionResult> {

    const certificado =
      await this.certificadoService.generar(
        context.entidadId!,
      );

    return {
      success: true,
      message: 'Certificado generado correctamente',
      data: {
        certificadoId: certificado.id,
      },
    };
  }
}
```

---

# 27. Registry de handlers

Crear un registro:

```typescript
@Injectable()
export class ActionHandlerRegistry {

  private readonly handlers =
    new Map<string, ActionHandler>();

  constructor(
    @Inject(ACTION_HANDLERS)
    handlers: ActionHandler[],
  ) {
    for (const handler of handlers) {
      this.handlers.set(handler.code, handler);
    }
  }

  get(code: string): ActionHandler {

    const handler =
      this.handlers.get(code);

    if (!handler) {
      throw new Error(
        `No existe un handler registrado para la acción: ${code}`,
      );
    }

    return handler;
  }
}
```

El motor nunca debe conocer directamente las clases concretas.

---

# 28. Registro de handlers en NestJS

No asumir que NestJS automáticamente inyectará un array con todas las implementaciones.

Utilizar un token explícito.

Ejemplo:

```typescript
export const ACTION_HANDLERS =
  Symbol('ACTION_HANDLERS');
```

Provider:

```typescript
{
  provide: ACTION_HANDLERS,
  inject: [
    GenerarCertificadoHandler,
    AprobarSolicitudHandler,
    RechazarSolicitudHandler,
  ],
  useFactory: (
    generarCertificado: GenerarCertificadoHandler,
    aprobarSolicitud: AprobarSolicitudHandler,
    rechazarSolicitud: RechazarSolicitudHandler,
  ) => [
    generarCertificado,
    aprobarSolicitud,
    rechazarSolicitud,
  ],
}
```

Inicialmente utilizar esta estrategia explícita.

Si posteriormente existen decenas o cientos de handlers, se puede implementar discovery/decorators.

---

# 29. Acciones automáticas

Una acción puede ser:

```text
MANUAL
```

o:

```text
AUTOMATICA
```

Ejemplo:

```text
APROBAR_VACACIONES
MANUAL
```

Después:

```text
APROBAR_VACACIONES
       ↓
siguiente fase
       ↓
FINALIZACION
       ↓
GENERAR_CERTIFICADO
       ↓
AUTOMATICA
```

El usuario no tiene que realizar una segunda llamada HTTP.

El motor detecta:

```text
TIPO_EJECUCION = AUTOMATICA
```

y ejecuta el handler correspondiente.

---

# 30. Responsabilidad dinámica

Ejemplo:

```text
APROBAR_VACACIONES
    ↓
Responsable = JEFE_DEL_SOLICITANTE
```

Alexander crea una solicitud.

El sistema consulta:

```text
¿Quién es el jefe de Alexander?
```

Resultado:

```text
Carlos
```

Se genera:

```text
TPROCESOINSTANCIARESPONSABLE

Instancia 123
Acción APROBAR_VACACIONES
Usuario Carlos
Estado PENDIENTE
```

Si posteriormente Alexander cambia de jefe:

```text
Alexander → María
```

la instancia #123 continúa asignada a Carlos.

No recalcular automáticamente responsabilidades históricas.

Si se requiere cambiarlo, debe existir una operación explícita de reasignación.

---

# 31. Múltiples responsables y concurrencia

Si una acción tiene varios responsables:

```text
APROBAR_VACACIONES

Carlos
María
Juan
```

todos pueden visualizar la tarea.

Pero solamente el primero que ejecute correctamente la acción debe poder completar la transición.

Ejemplo:

```text
Carlos APRUEBA
       ↓
instancia avanza
       ↓
María y Juan
       ↓
tareas CANCELADAS
```

Las operaciones deben ser seguras ante concurrencia.

La actualización de estado debe impedir que dos usuarios procesen simultáneamente la misma instancia.

---

# 32. Transacciones

Cuando una acción modifica:

- datos de negocio
- instancia del workflow
- historial
- ejecución de acción

debe utilizarse una transacción de Prisma cuando corresponda.

Conceptualmente:

```text
BEGIN TRANSACTION

Actualizar negocio
        ↓
Ejecutar workflow
        ↓
Actualizar instancia
        ↓
Registrar historial
        ↓
Registrar ejecución

COMMIT
```

Si falla:

```text
ROLLBACK
```

No permitir estados parciales.

---

# 33. Idempotencia

Las acciones importantes deben considerar idempotencia.

Ejemplo:

```text
GENERAR_CERTIFICADO
```

No debe generar:

```text
Certificado #1
Certificado #2
Certificado #3
```

si el mismo evento se procesa varias veces.

Debe existir una estrategia para detectar que la acción ya fue ejecutada para esa instancia/entidad.

---

# 34. Auditoría

Toda configuración debe mantener:

```text
USUARIO_CREACION
FECHA_CREACION
USUARIO_MODIFICACION
FECHA_MODIFICACION
ESTADO
FECHA_INICIO
FECHA_FIN
```

Las ejecuciones deben mantener:

```text
usuario
acción
fase
flujo
instancia
fecha
resultado
error
```

No eliminar físicamente información necesaria para reconstruir el historial.

---

# 35. Estructura recomendada de NestJS

```text
src/
├── app.module.ts
│
├── common/
│   ├── constants/
│   ├── decorators/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── utils/
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── workflow/
│   ├── workflow.module.ts
│   │
│   ├── controllers/
│   │   └── workflow.controller.ts
│   │
│   ├── services/
│   │   ├── workflow.service.ts
│   │   ├── workflow-query.service.ts
│   │   └── workflow-execution.service.ts
│   │
│   ├── handlers/
│   │   ├── action-handler.interface.ts
│   │   ├── action-handler.registry.ts
│   │   └── action-handlers.token.ts
│   │
│   ├── dto/
│   │   ├── execute-action.dto.ts
│   │   └── workflow-query.dto.ts
│   │
│   └── types/
│       ├── action-context.type.ts
│       └── action-result.type.ts
│
└── modules/
    └── talento-humano/
        ├── vacaciones/
        │   ├── handlers/
        │   │   ├── solicitar-vacaciones.handler.ts
        │   │   ├── aprobar-vacaciones.handler.ts
        │   │   └── rechazar-vacaciones.handler.ts
        │   │
        │   ├── services/
        │   │   └── vacaciones.service.ts
        │   │
        │   ├── controllers/
        │   │
        │   └── dto/
        │
        └── certificados/
            ├── handlers/
            │   └── generar-certificado.handler.ts
            │
            └── services/
                └── certificado.service.ts
```

---

# 36. Regla de separación de responsabilidades

El sistema debe respetar:

```text
CONTROLLER
    ↓
recibe HTTP
    ↓
SERVICE
    ↓
lógica de aplicación
    ↓
WORKFLOW ENGINE
    ↓
orquestación
    ↓
HANDLER
    ↓
acción específica
    ↓
DOMAIN SERVICE
    ↓
lógica de negocio
    ↓
PRISMA
    ↓
base de datos
```

El Workflow Engine no debe convertirse en un "God Service".

---

# 37. Primer flujo real

Utilizar vacaciones como primer caso de prueba.

Configuración:

```text
Módulo:
TALENTO_HUMANO

Proceso:
VACACIONES

Flujo:
VACACIONES_NORMAL
```

Fases:

```text
1. SOLICITUD
2. APROBACION
3. FINALIZACION
```

Acciones:

```text
SOLICITAR_VACACIONES
APROBAR_VACACIONES
RECHAZAR_VACACIONES
GENERAR_CERTIFICADO
```

Relación:

```text
SOLICITUD
    └── SOLICITAR_VACACIONES

APROBACION
    ├── APROBAR_VACACIONES
    └── RECHAZAR_VACACIONES

FINALIZACION
    └── GENERAR_CERTIFICADO
```

Responsables:

```text
SOLICITAR_VACACIONES
    → SOLICITANTE

APROBAR_VACACIONES
    → JEFE_DEL_SOLICITANTE

RECHAZAR_VACACIONES
    → JEFE_DEL_SOLICITANTE

GENERAR_CERTIFICADO
    → GRUPO RRHH
```

---

# 38. Ejecución esperada

Alexander solicita vacaciones.

```text
Alexander
    ↓
POST /vacaciones/solicitar
    ↓
crear TPROCESOINSTANCIA
    ↓
fase = SOLICITUD
```

Alexander ejecuta:

```text
SOLICITAR_VACACIONES
```

El motor:

```text
1. valida instancia
2. valida fase
3. valida acción
4. valida responsable
5. ejecuta handler
6. registra ejecución
7. busca siguiente fase
8. cambia a APROBACION
9. resuelve JEFE_DEL_SOLICITANTE
10. obtiene Carlos
11. crea asignación para Carlos
12. crea notificación para Carlos
```

Carlos consulta:

```http
GET /workflow/tasks
```

Obtiene:

```text
Solicitud de vacaciones de Alexander

Fase:
APROBACION

Acciones:
[ Aprobar ]
[ Rechazar ]
```

Carlos aprueba.

```text
POST /vacaciones/aprobar
```

El motor:

```text
1. valida usuario
2. valida instancia
3. valida fase
4. valida acción
5. valida responsable
6. ejecuta APROBAR_VACACIONES
7. registra ejecución
8. cancela otras asignaciones
9. avanza a FINALIZACION
10. resuelve RRHH
11. crea tareas
12. genera notificaciones
```

Si `GENERAR_CERTIFICADO` es automática:

```text
FINALIZACION
    ↓
GENERAR_CERTIFICADO
    ↓
GenerarCertificadoHandler
    ↓
CertificadoService
    ↓
Prisma
    ↓
COMPLETADO
```

---

# 39. Regla conceptual definitiva

La arquitectura debe respetar esta regla:

```text
La FASE determina:
    qué acciones están disponibles.

La ACCIÓN determina:
    quién puede ejecutarla.

La CONFIGURACIÓN DE RESPONSABLE determina:
    cómo encontrar a esos responsables.

La INSTANCIA determina:
    qué proceso real se está ejecutando.

TPROCESOINSTANCIARESPONSABLE determina:
    quién recibió concretamente la tarea.

TACCIONEJECUCION determina:
    quién ejecutó qué y cuándo.

TNOTIFICACION determina:
    cómo se informa al responsable.

El HANDLER determina:
    cómo se ejecuta realmente la acción.
```

---

# 40. Principio final

No construir un sistema donde toda la lógica esté en la base de datos.

Tampoco construir un sistema donde cada workflow esté completamente hardcodeado.

La arquitectura debe ser:

```text
                 CONFIGURACIÓN
                       │
                       ▼
                    DATABASE
                       │
                       │ define QUÉ
                       ▼
                WORKFLOW ENGINE
                       │
                       │ resuelve
                       ▼
                     ACCIÓN
                       │
                       ▼
                    HANDLER
                       │
                       │ define CÓMO
                       ▼
                DOMAIN SERVICE
                       │
                       ▼
                    PRISMA
```

El objetivo es poder crear un nuevo proceso configurando:

```text
Módulo
Proceso
Flujo
Fases
Acciones
Responsables
Operaciones
```

sin modificar el Workflow Engine.

Cuando una acción requiera comportamiento nuevo que no exista todavía, se implementa un nuevo `ActionHandler`.

---

# 41. Orden de implementación

Implementar en este orden:

### Fase 1 — Infraestructura

```text
NestJS
TypeScript
Prisma
PostgreSQL
ConfigModule
ValidationPipe
```

### Fase 2 — Base de datos

Crear:

```text
TMODULO
TPROCESO
TFLUJO
TFASES
TFLUJOFASES
TFASEACCION
TACCION
TACCIONRESPONSABLE
TOPERACION
```

### Fase 3 — Ejecución

Crear:

```text
TPROCESOINSTANCIA
TPROCESOINSTANCIARESPONSABLE
TPROCESOINSTANCIAHISTORIAL
TACCIONEJECUCION
TNOTIFICACION
```

### Fase 4 — CRUD de configuración

Crear APIs administrativas para:

```text
módulos
procesos
flujos
fases
acciones
responsables
operaciones
```

### Fase 5 — Workflow Engine

Implementar:

```text
crear instancia
obtener fase actual
obtener acciones
validar acción
resolver responsables
crear tareas
ejecutar acción
avanzar fase
finalizar proceso
```

### Fase 6 — Handler Registry

Implementar:

```text
ActionHandler
ActionHandlerRegistry
ACTION_HANDLERS
```

### Fase 7 — Primer caso real

Implementar:

```text
VACACIONES
```

con:

```text
SOLICITAR
APROBAR
RECHAZAR
GENERAR_CERTIFICADO
```

### Fase 8 — Bandeja

Implementar:

```http
GET /workflow/tasks
GET /workflow/my-processes
```

### Fase 9 — Notificaciones

Implementar:

```text
notificaciones internas
leído/no leído
cancelación
```

### Fase 10 — Seguridad y pruebas

Probar:

```text
usuario autorizado
usuario no autorizado
varios responsables
responsable dinámico
acción inexistente
acción fuera de fase
fase inexistente
doble ejecución
concurrencia
rollback
idempotencia
```

---

# 42. Resultado esperado

Al finalizar esta primera versión debe ser posible:

1. Crear un módulo.
2. Crear procesos dentro del módulo.
3. Crear diferentes flujos.
4. Definir fases.
5. Ordenar fases.
6. Asociar acciones a fases.
7. Definir responsables de acciones.
8. Resolver responsables estáticos y dinámicos.
9. Crear instancias reales.
10. Generar tareas para uno o varios responsables.
11. Generar notificaciones.
12. Consultar tareas por usuario.
13. Ejecutar acciones.
14. Validar autorización en backend.
15. Avanzar automáticamente entre fases.
16. Ejecutar acciones automáticas.
17. Registrar historial.
18. Registrar auditoría.
19. Evitar ejecuciones duplicadas.
20. Mantener la lógica específica en handlers/domain services.
21. Permitir agregar nuevos procesos sin modificar el motor.

## Regla que nunca debe romperse

> **La base de datos configura el workflow; el Workflow Engine lo orquesta; los Handlers ejecutan las acciones; los servicios de dominio contienen la lógica de negocio.**