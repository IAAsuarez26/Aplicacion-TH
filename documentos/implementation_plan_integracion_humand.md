# Plan de Integración: Aplicación TH ↔ Humand Public API

Este documento establece el plan técnico y arquitectónico para llevar a cabo la integración entre el sistema de gestión de Talento Humano (**Aplicación TH**) y la plataforma de experiencia del empleado y comunicación interna **Humand**, a través de sus respectivas APIs.

Contempla:
1. El **análisis y selección** de skills existentes en `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills`.
2. El **diseño y creación** de dos skills especializadas no presentes en el repositorio:
   - `humand-api-integration`: Guía canónica, arquitectura y referencia técnica completa de la API v1 de Humand.
   - `th-humand-sync-engine`: Motor de sincronización, reglas de transformación y flujos de conciliación de datos entre Aplicación TH (Insforge/PostgreSQL) y Humand.
3. El despliegue de las nuevas skills en el entorno global y en los repositorios correspondientes.

---

## User Review Required

> [!IMPORTANT]
> **Puntos Críticos de la API de Humand descubiertos en la documentación técnica:**
> 1. **Autenticación Estricta**: El header de autorización debe ser `Authorization: Basic {api_key}`. El uso de `Bearer` es rechazado con el error `API_KEY_NOT_PROVIDED`.
> 2. **Comportamiento PUT vs PATCH en Usuarios**:
>    - `PUT /users` (Upsert masivo): Reemplaza el recurso **completo**. Campos omitidos quedan en `null`. Crucialmente, **no dispara correos de bienvenida automáticos**, siendo el método ideal para la sincronización inicial y masiva de la nómina.
>    - `POST /users`: Si el usuario tiene email, **dispara automáticamente un correo electrónico** al empleado.
>    - `PATCH /users/{employeeInternalId}`: Modifica solo los campos enviados; no altera los demás datos. Ideal para actualizaciones incrementales (cambio de teléfono, corrección de nombres, etc.).
> 3. **Paginación Dual**:
>    - `/users`: Utiliza `limit` (máximo 50) + `offset`.
>    - `/departments`, `/job-positions`, `/segmentations`: Utilizan `page` + `limit`.
> 4. **Organigrama y Jerarquías**:
>    - Asignar una relación `BOSS` a un usuario genera automáticamente la relación inversa `SUBORDINATE` en el jefe correspondiente. También se soporta el rol `REVIEWER` (aprobador designado de vacaciones/flujos).
> 5. **Campos Dinámicos vs Segmentaciones**:
>    - Los campos de autocompletado en formularios y trámites de Humand **solo leen del perfil del usuario y campos de perfil (`fields`)**, no de segmentaciones. Datos informativos permitidos como Sede o Cédula pueden sincronizarse como campos de perfil.
>    - **POLÍTICA DE CONFIDENCIALIDAD DLP (EXCLUSIÓN SALARIAL)**: Queda terminantemente prohibido transmitir o exponer bandas salariales, salarios, medianas o tabuladores en Humand. Toda la estructura salarial permanece confinada exclusivamente en la base de datos interna de Aplicación TH.

> [!NOTE]
> **Arquitectura de Aplicación TH**:
> `Aplicacion TH` está construida sobre React + TypeScript con backend PostgreSQL gestionado a través de Insforge (`@insforge/sdk`). Las entidades operativas (`Empleado`, `Cargo`, `Departamento`, `Empresa`) se mapean a Humand (`users`, `job-positions`, `departments`, `segmentations`, `fields`, `relationships`), mientras que `TabuladorEmpresa` permanece 100% aislada en TH.

---

## 1. Análisis y Selección de Skills Existentes

De las más de 1,700 skills analizadas en `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills`, se seleccionan las siguientes skills clave que aportan soporte transversal a la integración:

| Skill Seleccionada | Rol en la Integración TH ↔ Humand | Justificación Técnica |
| :--- | :--- | :--- |
| **`api-integration`** | Arquitectura y Patrones | Manejo de flujos de integración, pipelines ETL, composición de servicios, diseño de webhooks y estrategias de sincronización por lotes. |
| **`api-security-best-practices`** | Seguridad y Resiliencia | Gestión segura de credenciales (`Authorization: Basic`), sanitización de datos de empleados (DLP/PII), rate limiting con cabeceras `RateLimit` y manejo del error HTTP `429 Too Many Requests` con backoff exponencial basado en `Retry-After`. |
| **`api-sdk-generator`** | Generación de Cliente/SDK | Creación de una biblioteca cliente tipada (TypeScript/Python) con modelos de solicitud/respuesta validados para la API de Humand. |
| **`postman-collection-generator`** | Pruebas de Contrato y QA | Generación automatizada de una colección Postman v2.1 con todos los endpoints de Humand v1 para pruebas de regresión, certificación de conectividad y testing de integración. |
| **`api-patterns`** | Estándares REST | Patrones de paginación (`limit/offset` vs `page/limit`), idempotencia, serialización de fechas ISO 8601 y semántica de métodos HTTP (PUT vs PATCH vs DELETE). |
| **`python-fastapi-development`** / **`fastapi-pro`** | Servicio de Sincronización | En caso de desplegar un servicio daemon o worker de sincronización en segundo plano con colas y tareas asíncronas para la conciliación nocturna o en tiempo real. |
| **`hr-pro`** | Reglas de Negocio de Talento Humano | Comprensión de los ciclos de vida de empleados: altas (onboarding), transferencias de departamento/cargo, licencias/vacaciones (PTO) y bajas (offboarding). |

---

## 2. Detección de Brechas: Nuevas Skills a Diseñar y Crear

El repositorio general no cuenta con herramientas específicas para la plataforma Humand ni para la conciliación entre la estructura de `Aplicacion TH` y Humand. Por tanto, se diseñarán y crearán **dos nuevas skills de nivel enterprise**:

### Skill 1: `humand-api-integration`
- **Ubicaciones de despliegue**:
  1. `C:\Users\asuarez\.gemini\config\skills\humand-api-integration\`
  2. `C:\Users\asuarez\Documents\GitHub\Antigravity\Aplicacion TH\.agents\skills\humand-api-integration\`
  3. `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills\skills\humand-api-integration\`
- **Contenido y Capacidades**:
  - **Especificación canónica de Humand Public API v1**: Base URL `https://api-prod.humand.co/public/api/v1`.
  - **Autenticación y Seguridad**: Header `Authorization: Basic {api_key}`, códigos de error de autenticación (`API_KEY_NOT_PROVIDED`, `UNKNOWN_TOKEN`, `FORBIDDEN`).
  - **Módulo de Usuarios (`/users`)**:
    - `PUT /users` (Upsert masivo sin disparar correos automáticos).
    - `POST /users` (Creación individual con notificación por email).
    - `PATCH /users/{employeeInternalId}` (Actualización granular de atributos).
    - `POST /users/{employeeInternalId}/deactivate` (Bajas con motivo y reasignación de jefatura).
    - `POST /users/{employeeInternalId}/reactivate` (Reincorporaciones).
    - `PATCH /users/{employeeInternalId}/profile-fields` (Campos de perfil dinámicos por UUID/nombre).
  - **Módulo de Estructura Organizacional**:
    - Departamentos: `/departments` y `/departments/bulk`.
    - Puestos/Cargos: `/job-positions` y `/job-positions/bulk`.
    - Asignaciones de puesto y departamento por usuario.
  - **Módulo de Segmentaciones (`/segmentations`)**:
    - Grupos e ítems (Empresa, Sede, Unidad de Negocio, Convenio).
  - **Módulo de Tiempos y Asistencia**:
    - `/time-off`: Saldos, solicitudes y aprobaciones de vacaciones/permisos.
    - `/time-tracking`: Fichajes (entradas, salidas, registros apareados) y resúmenes diarios.
  - **Módulo de Documentos (`/users/documents`)**:
    - Carga de recibos de pago / comprobantes de nómina a los expedientes de Humand.
  - **Gobernanza de Rate Limiting y Paginación**: Políticas de backoff, límites de 50 usuarios por request en listado de usuarios.

---

### Skill 2: `th-humand-sync-engine`
- **Ubicaciones de despliegue**:
  1. `C:\Users\asuarez\.gemini\config\skills\th-humand-sync-engine\`
  2. `C:\Users\asuarez\Documents\GitHub\Antigravity\Aplicacion TH\.agents\skills\th-humand-sync-engine\`
  3. `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills\skills\th-humand-sync-engine\`
- **Contenido y Capacidades**:
  - **Matriz de Mapeo de Datos (Data Mapping Engine)**:
    - `Empleado` (TH) ↔ `User` (Humand):
      * `codigo_empleado` → `employeeInternalId`
      * `documento_identidad` → Profile Field `"Documento de Identidad"` / `"Cédula"`
      * `nombres` → `firstName`
      * `apellidos` → `lastName`
      * `email` / `email_corporativo` → `email`
      * `telefono` → `phoneNumber`
      * `fecha_ingreso` → `hiringDate` (formato YYYY-MM-DD)
      * `di_supervisor` → `relationships`: `[{"name": "BOSS", "employeeInternalId": supervisor_codigo}]`
      * `di_evaluador` → `relationships`: `[{"name": "REVIEWER", "employeeInternalId": evaluador_codigo}]`
      * `estado_laboral`:
        - `ACTIVO` → status `ACTIVE`
        - `INACTIVO` → `POST /users/{id}/deactivate`
        - `VACACIONES` / `LICENCIA` → status `ACTIVE` + solicitud registrada en `time-off`.
    - `Departamento` (TH) ↔ `Department` (Humand): Creación en lote y asignación.
    - `Cargo` (TH) ↔ `JobPosition` (Humand): Creación en lote y asignación.
    - `Empresa` / `Sede` (TH) ↔ `Segmentations` (Humand): Segmentación por entidad legal y centro geográfico.
    - `Compensación / Tabulador` (TH): **EXCLUIDO TOTALMENTE** por política de confidencialidad y DLP. No se transmite a Humand.
  - **Flujos de Sincronización Operativos**:
    1. **Sincronización Inicial (Batch Onboarding)**: Carga en cascada de Catálogos (Empresas, Departamentos, Cargos) -> Carga de Usuarios en modo Upsert (`PUT /users`) -> Asignación de Jerarquías (`relationships`).
    2. **Sincronización Incremental (Delta Sync)**: Detección de modificaciones en TH por `updated_at` y aplicación selectiva con `PATCH /users/{id}`.
    3. **Proceso de Bajas (Offboarding Controlado)**: Desactivación en Humand indicando motivo formal (`RESIGNATION`, `DISMISSAL`, `RETIREMENT`, etc.) y reasignación de subordinados al nuevo jefe.
    4. **Sincronización de Vacaciones (Time-Off)**: Conciliación de solicitudes aprobadas de vacaciones entre el sistema de nómina y los balances de Humand.
    5. **Exportación de Fichajes (Time-Tracking)**: Extracción de registros de fichaje de Humand para alimentar el cálculo de horas y sobretiempos en la prenómina de TH.
  - **Mecanismos de Confiabilidad e Idempotencia**:
    - Hashes de estado (SHA-256) por empleado para evitar llamadas redundantes a la API.
    - Modo Dry-Run (conciliación previa sin impacto en producción).
    - Bitácora de sincronización estructurada (Sync Audit Log) y cola de reintentos para fallos temporales.

---

## 3. Plan de Despliegue y Estructura de Archivos

### Nuevos Archivos a Crear

#### Para `humand-api-integration`:
- [NEW] `C:\Users\asuarez\.gemini\config\skills\humand-api-integration\SKILL.md`
- [NEW] `C:\Users\asuarez\.gemini\config\skills\humand-api-integration\references\endpoints_reference.md`
- [NEW] `C:\Users\asuarez\.gemini\config\skills\humand-api-integration\references\error_catalog.md`
- [NEW] `C:\Users\asuarez\Documents\GitHub\Antigravity\Aplicacion TH\.agents\skills\humand-api-integration\SKILL.md`
- [NEW] `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills\skills\humand-api-integration\SKILL.md`

#### Para `th-humand-sync-engine`:
- [NEW] `C:\Users\asuarez\.gemini\config\skills\th-humand-sync-engine\SKILL.md`
- [NEW] `C:\Users\asuarez\.gemini\config\skills\th-humand-sync-engine\references\data_mapping_matrix.md`
- [NEW] `C:\Users\asuarez\.gemini\config\skills\th-humand-sync-engine\references\sync_workflows.md`
- [NEW] `C:\Users\asuarez\Documents\GitHub\Antigravity\Aplicacion TH\.agents\skills\th-humand-sync-engine\SKILL.md`
- [NEW] `C:\Users\asuarez\Documents\GitHub\Mis Repositorios\agentic-awesome-skills\skills\th-humand-sync-engine\SKILL.md`

#### Script Automatizado de Despliegue y Registro:
- [NEW] `c:\Users\asuarez\Documents\GitHub\Antigravity\Analizador de Skills\deploy_humand_skills.py`
  (Crea los directorios, escribe los archivos canónicos con codificación UTF-8 y registra las nuevas skills en `skills_index.json`).

---

## 4. Plan de Verificación

### Pruebas Automatizadas
1. **Validación de Integridad de Frontmatter**: Comprobación con script Python de que los archivos `SKILL.md` cumplen con el formato estándar requerido por Antigravity IDE (`name`, `description`).
2. **Validación de Enlaces y Referencias**: Verificación de que los archivos de soporte en `references/` existen y son legibles.
3. **Validación del Registro en Catálogo**: Verificación de que `skills_index.json` en `agentic-awesome-skills` incluye las nuevas entradas sin errores de sintaxis JSON.

### Verificación Funcional de Mapeo
1. Ejecución de un script de prueba de transformación de datos (simulando una lista de empleados de `Aplicacion TH`) para constatar que el payload generado para `PUT /users`, `PATCH /users/{id}` y `POST /users/{id}/deactivate` se adhiere 100% al esquema exigido por Humand API.

---

¿Deseas que proceda con la creación, despliegue y registro de las dos nuevas skills especializadas según este plan?
