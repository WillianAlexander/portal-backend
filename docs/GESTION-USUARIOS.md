# Gestión de Usuarios — SITH Backend

Todos los endpoints de administración requieren el header `X-Admin-Key` con el valor
definido en la variable de entorno `ADMIN_API_KEY` del servidor.

En desarrollo la clave es `admin-dev-key-2026`.  
En producción se debe cambiar por un valor seguro en Dokploy/entorno de despliegue.

Base URL desarrollo: `http://localhost:3001/api`

---

## ¿Cómo funciona el acceso al sistema?

1. El usuario existe en la tabla `tusuario` con su **email corporativo** (`@coopgualaquiza.fin.ec`).
2. La primera vez que inicia sesión con Microsoft 365, el sistema vincula automáticamente
   su OID de Azure AD a su registro. No necesita hacer nada adicional.
3. A partir del segundo login, el acceso es inmediato.

Si un empleado intenta ingresar y **no está registrado**, recibirá un error 401.
El administrador debe registrarlo primero usando los endpoints de abajo.

---

## Endpoints

### Listar todos los usuarios

```
GET /api/admin/usuarios
X-Admin-Key: admin-dev-key-2026
```

---

### Registrar un usuario nuevo

```
POST /api/admin/usuarios
X-Admin-Key: admin-dev-key-2026
Content-Type: application/json

{
  "cempleado":    "EMP001",
  "cedula":       "1712345678",
  "nombre":       "Juan Pérez López",
  "email":        "juan.perez@coopgualaquiza.fin.ec",
  "cargo":        "Analista de Crédito",
  "departamento": "Crédito y Cobranza",
  "agencia":      "Gualaquiza"
}
```

**Campos requeridos:** `cempleado`, `cedula`, `nombre`, `email`  
**Campos opcionales:** `cargo`, `departamento`, `agencia`

> `cempleado` es el código interno del empleado (código de nómina, número de empleado, etc.).
> Debe ser único. Si no tienen un código definido, pueden usar la cédula como valor.

**Respuesta exitosa (201):**
```json
{
  "cempleado": "EMP001",
  "cedula": "1712345678",
  "nombre": "Juan Pérez López",
  "email": "juan.perez@coopgualaquiza.fin.ec",
  "cargo": "Analista de Crédito",
  "departamento": "Crédito y Cobranza",
  "agencia": "Gualaquiza",
  "activo": true
}
```

**Errores posibles:**
- `409 Conflict` — ya existe un usuario con ese cempleado, cédula o email
- `400 Bad Request` — campos requeridos faltantes o formato inválido
- `401 Unauthorized` — API key incorrecta o ausente

---

### Desactivar un usuario (bloquear acceso)

```
PATCH /api/admin/usuarios/{cempleado}/desactivar
X-Admin-Key: admin-dev-key-2026
```

El usuario queda en la base de datos pero no puede iniciar sesión.
Usar cuando un empleado sale de la organización o se suspende temporalmente.

---

### Reactivar un usuario

```
PATCH /api/admin/usuarios/{cempleado}/activar
X-Admin-Key: admin-dev-key-2026
```

---

### Eliminar un usuario permanentemente

```
DELETE /api/admin/usuarios/{cempleado}
X-Admin-Key: admin-dev-key-2026
```

> **Precaución:** elimina el registro definitivamente. Preferir desactivar sobre eliminar
> para mantener trazabilidad histórica.

---

## Ejemplo con curl

```bash
# Registrar usuario
curl -X POST http://localhost:3001/api/admin/usuarios \
  -H "X-Admin-Key: admin-dev-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "cempleado": "EMP001",
    "cedula": "1712345678",
    "nombre": "Juan Pérez López",
    "email": "juan.perez@coopgualaquiza.fin.ec",
    "cargo": "Analista de Crédito",
    "departamento": "Crédito y Cobranza",
    "agencia": "Gualaquiza"
  }'

# Listar usuarios
curl http://localhost:3001/api/admin/usuarios \
  -H "X-Admin-Key: admin-dev-key-2026"

# Desactivar usuario
curl -X PATCH http://localhost:3001/api/admin/usuarios/EMP001/desactivar \
  -H "X-Admin-Key: admin-dev-key-2026"
```

---

## Configuración en producción

En Dokploy, agregar la variable de entorno:

```
ADMIN_API_KEY=<clave-segura-aleatoria-minimo-32-caracteres>
```

Generar una clave segura con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar la clave en un lugar seguro (gestor de contraseñas del equipo).
**No compartir por Slack, email ni dejar en el repositorio.**
