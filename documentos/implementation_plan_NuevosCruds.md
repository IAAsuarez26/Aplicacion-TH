# Plan de Implementación: Nuevos CRUDs (Denominaciones y Perfiles) y Ajuste de Cargos y Empleados

Implementación completa de las interfaces y flujos de gestión (CRUD) para las dos nuevas entidades del modelo organizacional: **Denominaciones de Cargos** (`denominaciones_cargos`) y **Perfiles de Competencias** (`perfiles_competencias`), junto con la adaptación de los módulos existentes de **Cargos** y **Empleados** para reflejar fielmente sus columnas foráneas (`codigo_dc` y `codigo_pc`), métricas, filtros y vistas de detalle.

---

## Contexto y Diagnóstico Actual

1. **Base de Datos (InsForge Postgres)**:
   - Ya cuenta con las tablas `denominaciones_cargos` (17 registros activos: *Analista, Coordinador, Gerente, etc.*) y `perfiles_competencias` (3 registros: *Administrativo, Líder, Operativo*).
   - La tabla `cargos` posee la columna `codigo_dc` vinculada por FK a `denominaciones_cargos(codigo_dc)`.
   - La tabla `empleados` posee la columna `codigo_pc` vinculada por FK a `perfiles_competencias(codigo_pc)`.
   - El cliente API (`src/lib/insforge.ts`) ya expone `denominacionesCargosApi` y `perfilesCompetenciasApi` con sus métodos CRUD (`getAll`, `getById`, `create`, `update`, `delete`).

2. **Faltantes en la Aplicación Web**:
   - **Nuevos Módulos**: No existen los componentes de interfaz para administrar directamente el catálogo de Denominaciones ni el catálogo de Perfiles de Competencia.
   - **Navegación**: Falta registrar las rutas y pestañas en `Sidebar.tsx`, `Header.tsx` y `App.tsx`.
   - **Módulo de Cargos**: Carece de barra de filtros por denominación, KPIs de cobertura de denominaciones y ordenamiento alfabético en el selector.
   - **Módulo de Empleados**: Requiere enriquecer los KPI cards con métricas de perfiles, filtro por denominación del cargo asociado, visualización de la denominación vinculada al seleccionar un cargo en el formulario modal, y tarjeta de resumen en el modal de detalle del colaborador.

---

## Cambios Propuestos

### 1. Nuevos Módulos CRUD

#### [NEW] [DenominacionesCargosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/denominaciones/DenominacionesCargosModule.tsx)
- **Propósito**: Módulo administrativo completo para `denominaciones_cargos`.
- **Características**:
  - **KPI Cards**: Total de Denominaciones, Activas, Inactivas y Total de Cargos asociados.
  - **DataTable**: Búsqueda en tiempo real por código (`codigo_dc`) o nombre (`denominacion`), ordenamiento por columnas, conteo de cargos adscritos por denominación con badge interactivo, badge de estado y exportación a CSV/Excel.
  - **Modal de Creación/Edición**: Autogeneración predictiva del código (`DC-0018`), validación de unicidad, edición de nombre y switch de estado activo/inactivo.
  - **Modal de Eliminación**: Confirmación segura con verificación de integridad referencial (alerta si existen cargos asociados antes de borrar).

#### [NEW] [PerfilesCompetenciasModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/perfiles/PerfilesCompetenciasModule.tsx)
- **Propósito**: Módulo administrativo completo para `perfiles_competencias`.
- **Características**:
  - **KPI Cards**: Total de Perfiles, Perfiles Activos, Distribución de colaboradores por perfil (*Líder*, *Administrativo*, *Operativo*).
  - **DataTable**: Búsqueda por código (`codigo_pc`) o perfil, visualización con paleta semántica (*Líder*: Emerald, *Administrativo*: Cyan, *Operativo*: Amber), conteo de colaboradores vinculados, estado y exportación.
  - **Modal de Creación/Edición**: Formulario modal estilizado con validaciones y switch de estado.
  - **Modal de Eliminación**: ConfirmDialog con prevención de eliminación en caso de dependencias con personal.

---

### 2. Actualización de CRUDs Existentes

#### [MODIFY] [CargosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/cargos/CargosModule.tsx)
- **KPI Cards**: Agregar tarjetas de métricas en la cabecera:
  - Total de Cargos
  - Cargos con Denominación asignada (`codigo_dc` no nulo)
  - Cargos pendientes de homologación (sin denominación)
  - Cargos activos
- **Barra de Filtros**:
  - Agregar filtro desplegable por `Denominación (DC)` para ver rápidamente todos los puestos bajo una misma clasificación (ej. todos los "Gerente", "Analista", etc.).
  - Filtro por estado activo/inactivo.
- **DataTable**:
  - Mejorar la visualización del badge de denominación (`DC-XXXX - Nombre`) y permitir ordenar/buscar por este campo.
- **Modal de Formulario**:
  - Ordenar alfabéticamente el selector de Denominaciones.
  - Añadir badge informativo que indique la función del catálogo DC.

#### [MODIFY] [EmpleadosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/empleados/EmpleadosModule.tsx)
- **KPI Cards**:
  - Incorporar tarjeta métrica de desglose de **Perfiles de Competencia** (Líder / Administrativo / Operativo / Sin Perfil).
- **Filtros Avanzados**:
  - Agregar filtro adicional por **Denominación del Cargo** (`filtroDenominacion`), permitiendo filtrar todos los empleados cuyo cargo tenga cierta denominación común.
- **DataTable**:
  - En la columna de *Cargo & Departamento*, incluir una etiqueta compacta de la Denominación del Cargo (ej. `Cargo-0010 (Gerente)`).
  - Mantener y estilizar la columna *Perfil Competencias* con colores distintivos por tipo de perfil.
- **Formulario Modal (Crear / Editar)**:
  - Al seleccionar un Cargo en el formulario, mostrar un preview inmediato de su Denominación asociada.
  - Selector de *Perfil de Competencias (PC)* optimizado con badges y ayuda contextual.
- **Modal de Expediente (Detalle)**:
  - Mostrar explícitamente tanto el Perfil de Competencia (`PC-XXXX - Perfil`) como la Denominación del Cargo en la ficha del colaborador.

---

### 3. Navegación e Integración Global

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/layout/Sidebar.tsx)
- Ampliar el tipo `NavigationTab` con `'denominaciones_cargos'` y `'perfiles_competencias'`.
- En el grupo `GESTIÓN DE TALENTO`, incorporar:
  - **Denominaciones (DC)** (Ícono `Tag` o `BookmarkCheck`, badge `'DC-XXXX'`)
  - **Perfiles de Competencia (PC)** (Ícono `ShieldCheck` o `Award`, badge `'PC-XXXX'`)

#### [MODIFY] [Header.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/layout/Header.tsx)
- Añadir títulos y subtítulos institucionales para las pestañas `denominaciones_cargos` y `perfiles_competencias`.

#### [MODIFY] [App.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/App.tsx)
- Importar y renderizar condicionalmente `DenominacionesCargosModule` y `PerfilesCompetenciasModule` según el `activeTab`.

---

## Plan de Verificación

### Pruebas Automatizadas y de Compilación
- Ejecutar chequeo estricto de TypeScript:
  ```powershell
  npx tsc --noEmit
  ```
- Validar compilación de producción con Vite:
  ```powershell
  npm run build
  ```

### Verificación Funcional y Visual
1. **Denominaciones de Cargos**:
   - Navegar a la pestaña "Denominaciones (DC)".
   - Comprobar que liste las 17 denominaciones cargadas desde la migración.
   - Crear una nueva denominación de prueba (ej. `DC-0018` - `Consultor Externo`), editarla y verificar persistencia en InsForge.
2. **Perfiles de Competencias**:
   - Navegar a la pestaña "Perfiles de Competencia (PC)".
   - Comprobar que muestre los 3 perfiles (*Administrativo, Líder, Operativo*) con sus badges y conteo de uso.
   - Crear y editar un perfil de prueba.
3. **CRUD de Cargos**:
   - Abrir "Catálogo de Cargos", verificar los nuevos KPI cards.
   - Probar el filtro rápido por Denominación.
   - Editar un cargo asignándole una denominación y verificar que se actualice en la tabla y en la base de datos.
4. **CRUD de Empleados**:
   - Abrir "Ficha de Empleados", verificar KPIs y los filtros por Perfil y Denominación.
   - Editar un empleado asignándole un Perfil de Competencia (ej. PC-0002 Líder).
   - Abrir la ficha de detalle (ojo) y verificar que refleje el Perfil y la Denominación del Cargo asignado.
