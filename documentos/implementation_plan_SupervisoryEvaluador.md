# Plan de Implementación: Replicación de di_supervisor y di_evaluador hacia TH_Replica

Este plan describe la incorporación de los campos `di_supervisor` y `di_evaluador` (cédula del supervisor y evaluador) en la base de datos **`TH_Replica`** (SQL Server en el servidor `SRV2022-DWII`), la actualización del procedimiento almacenado de replicación automática **`dbo.sp_Sincronizar_TH_InsForge`**, la actualización de la vista **`dbo.vw_organigrama_completo`** y la ejecución de la sincronización en vivo.

---

## Diagnóstico del Estado Actual

1. **En InsForge (PostgreSQL)**:
   - La tabla `public.empleados` ya cuenta con `di_supervisor VARCHAR(20)` y `di_evaluador VARCHAR(20)`.
   - Ambas columnas tienen claves foráneas activas hacia `public.empleados(documento_identidad)`.
   - Existe un trigger `trg_sync_supervisores` que mantiene sincronizados bidireccionalmente los IDs y las Cédulas.
   - La vista `vw_organigrama_completo` en InsForge ya realiza los `LEFT JOIN` hacia `sup.documento_identidad` y `ev.documento_identidad`.

2. **En TH_Replica (SQL Server en `SRV2022-DWII`)**:
   - La tabla `dbo.empleados` actualmente solo cuenta con las columnas numéricas `supervisor_directo_id` y `evaluador_id`. No posee `di_supervisor` ni `di_evaluador`.
   - El Stored Procedure `dbo.sp_Sincronizar_TH_InsForge` (ejecutado automáticamente por el Agente SQL Server cada 2 horas) no extrae ni inserta `di_supervisor` ni `di_evaluador`.
   - La vista `dbo.vw_organigrama_completo` en SQL Server aún realiza el join por `empleado_id`.

---

## User Review Required

> [!NOTE]
> **Consolidación en Documento de Identidad (Cédula):**
> Se eliminan definitivamente las columnas obsoletas `supervisor_directo_id` y `evaluador_id` tanto en la aplicación como en la réplica de SQL Server, consolidando de forma exclusiva `di_supervisor` y `di_evaluador` para evitar duplicidad y redundancia de datos.

---

## Proposed Changes

### 1. Base de Datos en Vivo (`SRV2022-DWII` -> `TH_Replica`)

#### [MODIFY] Tabla `[dbo].[empleados]`
- Agregar columnas `di_supervisor NVARCHAR(20) NULL` y `di_evaluador NVARCHAR(20) NULL`.
- Crear índices no agrupados:
  - `idx_empleados_di_supervisor` sobre `(di_supervisor)`
  - `idx_empleados_di_evaluador` sobre `(di_evaluador)`
  - `idx_empleados_doc_identidad` sobre `(documento_identidad)` para optimizar los joins relacionales.

#### [MODIFY] Procedimiento Almacenado `[dbo].[sp_Sincronizar_TH_InsForge]`
- Modificar tabla temporal `#tmp_empleados` para incluir `di_supervisor NVARCHAR(20)` y `di_evaluador NVARCHAR(20)`.
- Modificar la consulta `OPENQUERY(INSFORGE_PG, ...)` en el paso 11 (`EMPLEADOS`) para seleccionar `di_supervisor` y `di_evaluador`.
- Actualizar la sentencia `MERGE INTO dbo.empleados`:
  - En `WHEN MATCHED ... UPDATE SET`: actualizar `TARGET.di_supervisor = SOURCE.di_supervisor` y `TARGET.di_evaluador = SOURCE.di_evaluador`.
  - En `WHEN NOT MATCHED ... INSERT`: incluir `di_supervisor` y `di_evaluador`.

#### [MODIFY] Procedimiento Almacenado `[dbo].[sp_Sync_Empleados]`
- Actualizar la versión individual de sincronización de empleados para mantener paridad.

#### [MODIFY] Vista `[dbo].[vw_organigrama_completo]`
- Actualizar la proyección para incluir `e.di_supervisor` y `e.di_evaluador`.
- Cambiar la condición de vinculación de supervisor y evaluador:
  ```sql
  LEFT JOIN dbo.empleados sup ON e.di_supervisor = sup.documento_identidad
  LEFT JOIN dbo.empleados ev ON e.di_evaluador = ev.documento_identidad
  ```
- Actualizar la lógica del tipo de evaluador con los nuevos campos DI:
  ```sql
  CASE
      WHEN e.di_evaluador IS NOT NULL AND e.di_evaluador <> e.di_supervisor THEN 'EVALUADOR_ESPECIAL'
      ELSE 'SUPERVISOR_DIRECTO'
  END AS tipo_evaluador
  ```

---

### 2. Archivos de Control de Versiones en el Repositorio

#### [MODIFY] [01_Actualizacion_Estructura_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/01_Actualizacion_Estructura_TH_Replica.sql)
- Agregar validación DDL idempotente para añadir `di_supervisor` y `di_evaluador` a `[dbo].[empleados]`.
- Agregar creación de índices para los nuevos campos y documento de identidad.
- Actualizar la definición de la vista `[dbo].[vw_organigrama_completo]`.

#### [MODIFY] [02_Actualizacion_SP_Sincronizacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/02_Actualizacion_SP_Sincronizacion.sql)
- Actualizar el paso 11 de `[dbo].[sp_Sincronizar_TH_InsForge]` incorporando `di_supervisor` y `di_evaluador`.

#### [MODIFY] [script_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/script_TH_Replica.sql)
- Actualizar la definición canónica DDL de `dbo.empleados`, sus columnas, índices y la vista `vw_organigrama_completo`.

#### [MODIFY] [QueryCompensacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/QueryCompensacion.sql)
- Actualizar los joins de supervisor y evaluador en el CTE `th` para vincularse por `documento_identidad` usando `di_supervisor` y `di_evaluador`.

---

## Verification Plan

### 1. Ejecución DDL y Procedimiento en SQL Server
- Ejecutar el script DDL sobre `SRV2022-DWII` -> `TH_Replica` y verificar que las columnas e índices existan mediante `INFORMATION_SCHEMA.COLUMNS` y `sys.indexes`.
- Compilar el nuevo Stored Procedure `dbo.sp_Sincronizar_TH_InsForge`.

### 2. Ejecución y Validación de Réplica en Vivo
- Ejecutar:
  ```sql
  EXEC [dbo].[sp_Sincronizar_TH_InsForge];
  ```
- Comprobar que en `dbo.sync_log` el último registro tenga `estado = 'EXITOSO'`.
- Consultar empleados con supervisor asignado en `TH_Replica.dbo.empleados`:
  ```sql
  SELECT empleado_id, documento_identidad, nombres, apellidos, di_supervisor, di_evaluador, supervisor_directo_id, evaluador_id
  FROM dbo.empleados
  WHERE di_supervisor IS NOT NULL;
  ```
- Comprobar la vista `dbo.vw_organigrama_completo`:
  ```sql
  SELECT TOP 10 documento_identidad, nombre_completo_empleado, di_supervisor, supervisor_directo_nombre, di_evaluador, evaluador_especifico_nombre, tipo_evaluador
  FROM dbo.vw_organigrama_completo
  WHERE di_supervisor IS NOT NULL;
  ```
