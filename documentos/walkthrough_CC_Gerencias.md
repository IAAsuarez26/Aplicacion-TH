# Walkthrough: Reestructuración de Centros de Costos a Gerencias

Se ha completado satisfactoriamente la reestructuración de la base de datos y de la aplicación frontend para vincular los **Centros de Costos** a nivel de **Gerencias** (Nivel 2) en lugar de **Departamentos** (Nivel 3).

---

## 1. Resumen de Cambios Implementados

### Base de Datos (InsForge PostgreSQL `TH_PB`)
1. **Adición de columna foránea en `gerencias`**:
   - Se añadió `codigo_cc VARCHAR(20) NULL` a la tabla `public.gerencias`.
   - Se definió la restricción de clave foránea `fk_gerencias_codigo_cc` apuntando a `centros_costos(codigo_cc)` con `ON UPDATE CASCADE ON DELETE RESTRICT`.
   - Se creó el índice de rendimiento `idx_gerencias_codigo_cc`.
2. **Migración de datos**:
   - Los centros de costos existentes (`01` y `02`) fueron transferidos automáticamente a sus gerencias correspondientes (`Ger-0002` Sistemas & Tecnología y `Ger-0016` Talento Humano).
3. **Actualización de la Vista Organizacional (`vw_organigrama_completo`)**:
   - Se modificó la vista para realizar el `LEFT JOIN centros_costos cc ON g.codigo_cc = cc.codigo_cc` a través de `gerencias`.
   - Se preservaron las columnas `codigo_cc` y `centro_costo_descripcion` para no romper dependencias en el módulo de Organigrama ni en los reportes.
4. **Desvinculación y limpieza en `departamentos`**:
   - Se eliminó la clave foránea `fk_departamentos_codigo_cc`, el índice `idx_departamentos_codigo_cc` y la columna `codigo_cc` de `public.departamentos`.

---

### Scripts DDL y Esquemas
- [migration_centros_costos_a_gerencias_pg.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/migration_centros_costos_a_gerencias_pg.sql): Script de migración idempotente para PostgreSQL.
- [migration_centros_costos_a_gerencias_sqlserver.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/migration_centros_costos_a_gerencias_sqlserver.sql): Script de migración equivalente para SQL Server.
- [schema_organizacional_pg.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/schema_organizacional_pg.sql): Esquema DDL maestro PostgreSQL actualizado.
- [schema_organizacional.sql](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/schema_organizacional.sql): Esquema DDL maestro SQL Server actualizado.

---

### Frontend y Servicios API
- [src/lib/types.ts](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/lib/types.ts):
  - `Gerencia` ahora incluye `codigo_cc?: string | null`, `centro_costo?: CentroCosto` y `centro_costo_descripcion?: string`.
  - `Departamento` quedó completamente libre de propiedades de centros de costos.
- [src/lib/insforge.ts](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/lib/insforge.ts):
  - `gerenciasApi.create` y `gerenciasApi.update` reciben y persisten `codigo_cc`.
  - `departamentosApi.create` y `departamentosApi.update` desincorporaron el manejo de `codigo_cc`.
- [src/components/gerencias/GerenciasModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/gerencias/GerenciasModule.tsx):
  - Columna de **Centro de Costo** con badges visuales (`código - descripción`).
  - Selector de Centro de Costo en el formulario modal (creación / edición).
  - Filtro interactivo por Centro de Costo en barra superior.
  - Búsqueda en tabla por código de centro de costo habilitada.
- [src/components/departamentos/DepartamentosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/departamentos/DepartamentosModule.tsx):
  - **100% libre de Centros de Costos** cumpliendo la directriz del usuario: removidos imports, llamadas API, columna de tabla, selector en modal y filtros.
- [src/components/costos/CentrosCostosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/costos/CentrosCostosModule.tsx):
  - Ahora vincula y contabiliza **Gerencias Vinculadas** en vez de departamentos.
  - Filtro por Gerencia asociada.
  - Validación de seguridad ante intentos de borrado si existen gerencias vinculadas al centro de costos.

---

## 2. Verificación y Pruebas

### Compilación y Tipado TypeScript
Se ejecutó `npm run build` (`tsc && vite build`), finalizando con **código de salida 0**:
```text
✓ 1709 modules transformed.
dist/index.html                   1.49 kB │ gzip:   0.81 kB
dist/assets/index-BSoC0WrZ.css   50.17 kB │ gzip:   8.80 kB
dist/assets/index-YnIr7fBo.js    41.75 kB │ gzip:  13.09 kB
dist/assets/index-B315Zcr8.js   658.79 kB │ gzip: 149.19 kB
✓ built in 6.61s
```

### Comprobación de Datos en InsForge PostgreSQL
1. **Inspección de `gerencias`**:
   - `Ger-0002` ("Sistemas & Tecnología") vinculada con CC `'01'`.
   - `Ger-0016` ("Talento Humano") vinculada con CC `'02'`.
2. **Inspección de `departamentos`**:
   - Ya no posee la columna `codigo_cc`.
3. **Inspección de `vw_organigrama_completo`**:
   - Empleados y posiciones de la gerencia de Sistemas y de Talento Humano resolvieron exitosamente su centro de costo y su descripción a través de la vinculación en gerencias.
