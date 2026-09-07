# Actualización de Replicación: Eliminación de supervisor_directo_id / evaluador_id y Consolidación de di_supervisor / di_evaluador

## Descripción del Problema y Hallazgos

Se verificó el estado actual de la tabla fuente `public.empleados` en **InsForge (PostgreSQL)** mediante introspección directa de su esquema:
1. **Confirmado en PostgreSQL (`public.empleados`):**
   - Las columnas `di_supervisor` y `di_evaluador` existen (`character varying(20)`) con sus respectivas llaves foráneas e índices apuntando a `documento_identidad`.
   - Las columnas antiguas `supervisor_directo_id` y `evaluador_id` **fueron eliminadas físicamente** de la tabla fuente en InsForge.

2. **Diagnóstico del Proceso de Replicación:**
   - En el archivo [02_Actualizacion_SP_Sincronizacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/02_Actualizacion_SP_Sincronizacion.sql), el procedimiento `dbo.sp_Sincronizar_TH_InsForge` **aún incluía** `supervisor_directo_id` y `evaluador_id` en la definición de la tabla temporal `#tmp_empleados`, en la consulta `OPENQUERY(INSFORGE_PG, 'SELECT ... FROM public.empleados')` y en la sentencia `MERGE` (`UPDATE` e `INSERT`).
   - **Impacto crítico:** Al ejecutarse el SP, `OPENQUERY` falla inmediatamente con error de PostgreSQL: `column "supervisor_directo_id" does not exist`, deteniendo toda la sincronización.
   - Adicionalmente, en [01_Actualizacion_Estructura_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/01_Actualizacion_Estructura_TH_Replica.sql), [script_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/script_TH_Replica.sql) y [QueryCompensacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/QueryCompensacion.sql), la vista `dbo.vw_organigrama_completo` y los `JOIN` aún contemplan condiciones de contingencia basadas en los IDs obsoletos.

## User Review Required

> [!IMPORTANT]
> Se removerán definitivamente `supervisor_directo_id` y `evaluador_id` del flujo de sincronización y de la tabla destino `dbo.empleados` en `TH_Replica`.
> Las relaciones jerárquicas y evaluadoras quedan 100% asociadas al Documento de Identidad (`di_supervisor` y `di_evaluador`), lo que simplifica los `JOIN` y optimiza el rendimiento al aprovechar los índices `idx_empleados_doc_identidad`, `idx_empleados_di_supervisor` e `idx_empleados_di_evaluador`.

## Proposed Changes

### Procedimiento Almacenado de Replicación

#### [MODIFY] [02_Actualizacion_SP_Sincronizacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/02_Actualizacion_SP_Sincronizacion.sql)
- **#tmp_empleados:** Eliminar columnas `supervisor_directo_id INT` y `evaluador_id INT`.
- **OPENQUERY:** Remover `supervisor_directo_id` y `evaluador_id` del `SELECT` remoto hacia `public.empleados`.
- **MERGE:** Eliminar la asignación de `TARGET.supervisor_directo_id` y `TARGET.evaluador_id` en el bloque `UPDATE` y de la lista de columnas y valores en el bloque `INSERT`.

---

### Definición DDL y Migración de Estructura de Réplica

#### [MODIFY] [01_Actualizacion_Estructura_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/01_Actualizacion_Estructura_TH_Replica.sql)
- Añadir sección para eliminar de forma segura las columnas obsoletas `supervisor_directo_id` y `evaluador_id` de `dbo.empleados` en caso de que existan en la réplica SQL Server (eliminando previamente cualquier constraint asociada).
- Actualizar `dbo.vw_organigrama_completo`:
  - Remover las columnas `e.supervisor_directo_id` y `e.evaluador_id`.
  - Simplificar la condición del `CASE` para `tipo_evaluador` usando únicamente `e.di_evaluador` y `e.di_supervisor`.
  - Simplificar los `LEFT JOIN` a `dbo.empleados sup` y `ev` para relacionar directamente por `documento_identidad`.

#### [MODIFY] [script_TH_Replica.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/script_TH_Replica.sql)
- En la creación de tabla `dbo.empleados`, remover los campos `supervisor_directo_id` y `evaluador_id`.
- Actualizar `dbo.vw_organigrama_completo` para alinearse con la nueva estructura.

---

### Consultas Analíticas

#### [MODIFY] [QueryCompensacion.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Analizador%20SQL/documentos/QueryCompensacion.sql)
- En el CTE `th`, actualizar los joins a `sup` y `ev`:
  - `LEFT JOIN [dbo].[empleados] sup ON e.di_supervisor = sup.documento_identidad`
  - `LEFT JOIN [dbo].[empleados] ev ON e.di_evaluador = ev.documento_identidad`
  - Removiendo la condición condicional en desuso `OR (e.di_supervisor IS NULL AND e.supervisor_directo_id = sup.empleado_id)`.

## Verification Plan

### Automated Tests
- Validar sintaxis SQL de los scripts actualizados.
- Si la instancia local o vinculada de SQL Server está accesible vía `sqlcmd`, compilar y validar el SP y las vistas.

### Manual Verification
- Ejecutar `EXEC dbo.sp_Sincronizar_TH_InsForge` en SQL Server para verificar que la réplica procesa la tabla `empleados` sin errores de columna inexistente.
- Consultar `dbo.sync_log` para confirmar estado `EXITOSO`.
- Ejecutar queries de validación en `dbo.empleados` y `dbo.vw_organigrama_completo` confirmando la correcta resolución de supervisores y evaluadores por DI.
