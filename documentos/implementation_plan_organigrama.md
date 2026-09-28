# Plan de Implementación: Soporte Multiempresa y Filtro Principal en Organigrama (PB, LP, PK)

El módulo de Organigrama actualmente lista todas las direcciones mezcladas sin diferenciar a qué empresa filial pertenecen. Debido a que las 13 direcciones de **Ponce & Benzo (PB)** tienen los primeros IDs correlativos, las estructuras de **Laboratorios Ponce (LP)** y **Picking C.A. (PK)** quedaban relegadas o no eran identificables, mezclando la información organizacional.

Este cambio implementará un **Filtro Principal por Empresa** interactivo y prominente, segmentando visualmente y funcionalmente los tres niveles jerárquicos (Dirección $\rightarrow$ Gerencia $\rightarrow$ Departamento $\rightarrow$ Colaboradores) para cada compañía sin mezclar los datos.

---

## Cambios Propuestos

### Componente de Organigrama

#### [MODIFY] [`src/components/organigrama/OrganigramaModule.tsx`](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/organigrama/OrganigramaModule.tsx)

1. **Carga de Datos de Empresas**:
   - Importar `empresasApi` y tipo `Empresa`.
   - Cargar `empresasApi.getAll()` en `loadData()`.

2. **Controlador de Filtro Principal por Empresa**:
   - Crear estado `selectedEmpresaId` con valor inicial por defecto (ej. primera empresa activa o `PB` / `ALL`).
   - Diseñar una barra de navegación segmentada/pills en la cabecera superior con estilo de alta gama:
     - **PB - Ponce & Benzo Sucr, C.A.** (Conteo: 13 Direcciones)
     - **LP - Laboratorios Ponce, C.A.** (Conteo: 3 Direcciones, 8 Gerencias, 10 Departamentos)
     - **PK - Picking C.A.** (Conteo: 5 Direcciones, 7 Gerencias, 10 Departamentos)
     - **Consolidado / Todas**
   - Cada botón incluirá su badge distintivo de color (PB: Cian/Azul, LP: Esmeralda/Verde, PK: Ámbar/Naranja).

3. **Filtrado Jerárquico en Cascada**:
   - `filteredDirecciones`: filtra las direcciones pertenecientes a la empresa seleccionada.
   - `filteredGerencias`: filtra las gerencias adscritas a las direcciones de dicha empresa.
   - `filteredDepartamentos`: filtra los departamentos adscritos a las gerencias de dicha empresa.
   - `filteredEmpleados`: filtra los colaboradores adscritos a los departamentos de dicha empresa.

4. **Mejoras en el Árbol Visual (`arbol`)**:
   - Tarjetas de Dirección con etiqueta de empresa y badges de conteo jerárquico (Nº Gerencias, Nº Departamentos, Nº Colaboradores).
   - Botones rápidos para **"Expandir Todo"** y **"Contraer Todo"** en el árbol.
   - Auto-expansión inteligente del primer nodo de la empresa al cambiar de pestaña para visualización inmediata.
   - Mensajes vacíos amigables cuando una unidad aún no tiene sub-unidades creadas.

5. **Mejoras en el Explorador de Subordinados (`subordinados`)**:
   - El selector de supervisores se adaptará a la empresa seleccionada o indicará el tag de empresa de cada supervisor para evitar confusiones entre filiales.

6. **Mejoras en la Vista Completa (`tabla` - `vw_organigrama_completo`)**:
   - Filtrar los registros de la vista por la empresa activa seleccionada.
   - Agregar columna de Empresa con badge visual (`PB`, `LP`, `PK`).

---

## Plan de Verificación

### Compilación y Tipado
- Ejecutar `npm run build` (`tsc && vite build`) para asegurar cero errores de compilación o tipos TypeScript.

### Verificación Funcional
- Comprobar que al seleccionar **LP**, se visualicen inmediatamente sus 3 direcciones:
  - `Dir-0014: Cadena de Suministro`
  - `Dir-0015: Dirección Técnica`
  - `Dir-0016: Producción`
  con sus gerencias adscritas (como `Ger-0028: Operación Logística MOD`, `Ger-0029`, etc.) y sus departamentos.
- Comprobar que al seleccionar **PK**, se visualicen sus 5 direcciones (`Dir-0017` a `Dir-0021`) con sus respectivas gerencias y departamentos.
- Comprobar que al seleccionar **PB**, se visualice exclusivamente la estructura de Ponce & Benzo sin mezclarse con LP o PK.
- Comprobar que los botones "Expandir Todo" / "Contraer Todo" funcionen con fluidez.
