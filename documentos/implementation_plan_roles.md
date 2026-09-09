# Incorporación de Roles y Perfiles en la Plataforma de Talento Humano

Este documento presenta la propuesta técnica y el plan de implementación detallado para incorporar el sistema de **Roles y Perfiles de Acceso**, satisfaciendo los requerimientos de seguridad, control de accesos y administración delegada solicitados.

---

## 1. Alcance y Roles Definidos

Se crearán e integrarán formalmente los 5 roles especificados:

| Código de Rol | Nombre Oficial del Rol | Descripción y Propósito | ¿Puede Crear Usuarios y Modificar Roles? |
|---|---|---|:---:|
| `ADMIN_PLATAFORMA` | **Administrador de la plataforma** | Control total técnico y funcional de la plataforma. Acceso irrestricto a estructura corporativa, tabuladores, empleados, organigramas y seguridad. | **SÍ** |
| `GERENTE_TH` | **Gerente de TH** | Liderazgo directivo de Talento Humano. Acceso gerencial completo a todos los módulos y facultad de incorporar personal a la plataforma y asignar/modificar roles. | **SÍ** |
| `COORD_COMPENSACION` | **Coordinador de Compensación** | Especialista enfocado en Finanzas de TH: Tabuladores salariales (bandas 80%-120%), análisis de equidad interna (compa-ratio), tipos de costos (MOD/MOI) y centros de costos. | **NO** |
| `COORD_RECLUTAMIENTO` | **Coordinador de Reclutamiento** | Especialista enfocado en Captación y Estructura de Puestos: Catálogo de cargos, denominaciones (DC), perfiles de competencias (PC), requisición y altas de empleados. | **NO** |
| `ESPEC_RECLUTAMIENTO` | **Especialista de reclutamiento** | Operación táctica de selección: Ficha de empleados (ingresos), asignación de perfiles (PC), consulta de organigrama y catálogo de cargos. | **NO** |

> [!IMPORTANT]
> **Regla de Negocio Crítica:**
> **Únicamente el Administrador de la plataforma y el Gerente de TH** tendrán visibilidad y acceso al módulo de **Gestión de Usuarios**, así como la capacidad de invocar los endpoints/procedimientos para crear nuevos usuarios o actualizar roles y estatus.

---

## 2. Cambios Propuestos

### A. Base de Datos (PostgreSQL en InsForge DB `TH_PB`)

#### [NEW] Script DDL y Procedimientos: `migration_roles_usuarios_pg.sql`
1. **Tabla `public.roles`**:
   - `role_id SERIAL PRIMARY KEY`
   - `codigo VARCHAR(50) UNIQUE` (`ADMIN_PLATAFORMA`, `GERENTE_TH`, `COORD_COMPENSACION`, `COORD_RECLUTAMIENTO`, `ESPEC_RECLUTAMIENTO`)
   - `nombre VARCHAR(100) UNIQUE`
   - `descripcion TEXT`
   - `permite_gestion_usuarios BOOLEAN DEFAULT FALSE` (True solo para Admin y Gerente de TH)
   - `color VARCHAR(30)` (indicador visual: purple, blue, emerald, amber, indigo)
   - `activo BOOLEAN DEFAULT TRUE`
   - `created_at` y `updated_at` con trigger automático.

2. **Tabla `public.usuarios`**:
   - `usuario_id SERIAL PRIMARY KEY`
   - `auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
   - `email VARCHAR(255) UNIQUE NOT NULL`
   - `nombre VARCHAR(200) NOT NULL`
   - `rol_codigo VARCHAR(50) NOT NULL REFERENCES public.roles(codigo) ON UPDATE CASCADE`
   - `activo BOOLEAN DEFAULT TRUE`
   - `telefono VARCHAR(50)`
   - `cargo VARCHAR(100)`
   - `creado_por_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `ultimo_acceso TIMESTAMPTZ`
   - `created_at` y `updated_at`.

3. **Vista `public.vw_usuarios_roles`**:
   - Consolida información del usuario, datos del rol asociado, permisos de gestión de usuarios y metadatos para consultas limpias desde el frontend.

4. **Procedimientos Almacenados con `SECURITY DEFINER`**:
   - `sp_crear_usuario(p_email, p_password, p_nombre, p_rol_codigo, p_telefono, p_cargo)`:
     - Valida que quien ejecuta sea `ADMIN_PLATAFORMA` o `GERENTE_TH`.
     - Hashea la contraseña con `crypt()` compatible con el motor InsForge Auth (`$2b$10$...`).
     - Inserta en `auth.users` con `email_verified = true` (sin requerir confirmación por correo para cuentas creadas por administración).
     - Inserta en `public.usuarios` y vincula el rol.
     - **No afecta ni cierra la sesión activa** del administrador que está registrando el usuario.
   - `sp_asignar_rol_usuario(p_auth_user_id, p_nuevo_rol_codigo)`:
     - Valida permisos del ejecutor (`ADMIN_PLATAFORMA` o `GERENTE_TH`).
     - Actualiza `public.usuarios.rol_codigo` y sincroniza `auth.users.profile.role`.
   - `sp_cambiar_estado_usuario(p_auth_user_id, p_activo)`:
     - Permite activar o suspender el acceso de un usuario.
   - `sp_admin_cambiar_password(p_auth_user_id, p_new_password)`:
     - Permite al Administrador/Gerente TH restablecer la contraseña a un colaborador.

5. **Bootstrap de Usuario Existente**:
   - El usuario activo `asuarez@ponce-benzo.com` quedará automáticamente vinculado como `ADMIN_PLATAFORMA` (`Administrador de la plataforma`).

---

### B. Capa de Servicios y Tipos (`src/lib`)

#### [MODIFY] [types.ts](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/lib/types.ts)
- Agregar tipos:
  - `RolCodigo = 'ADMIN_PLATAFORMA' | 'GERENTE_TH' | 'COORD_COMPENSACION' | 'COORD_RECLUTAMIENTO' | 'ESPEC_RECLUTAMIENTO'`
  - `Rol`: entidad de la tabla `roles`.
  - `Usuario`: entidad de la tabla `usuarios` y vista `vw_usuarios_roles`.
  - Enriquecer `UserProfile` con `rol_codigo`, `permite_gestion_usuarios`, etc.

#### [MODIFY] [insforge.ts](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/lib/insforge.ts)
- Agregar servicios de API:
  - `rolesApi.getAll()`
  - `usuariosApi.getAll()`
  - `usuariosApi.getByAuthId(auth_user_id)`
  - `usuariosApi.create(...)` (vía RPC `sp_crear_usuario`)
  - `usuariosApi.updateRole(auth_user_id, nuevo_rol_codigo)` (vía RPC `sp_asignar_rol_usuario`)
  - `usuariosApi.updateStatus(auth_user_id, activo)` (vía RPC `sp_cambiar_estado_usuario`)
  - `usuariosApi.resetPassword(auth_user_id, new_password)` (vía RPC `sp_admin_cambiar_password`)

---

### C. Contexto de Autenticación y Autorización

#### [MODIFY] [AuthContext.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/context/AuthContext.tsx)
- Cargar dinámicamente el rol desde `public.usuarios` al iniciar sesión o rehidratar sesión.
- Exponer helpers en el contexto:
  - `user`: Perfil completo con rol exacto.
  - `canManageUsers`: `boolean` (True si el usuario es `ADMIN_PLATAFORMA` o `GERENTE_TH`).
  - `canAccessTab: (tab: NavigationTab) => boolean`: Valida si el rol tiene acceso al tab.
  - `switchDemoRole: (rol_codigo: RolCodigo) => void`: En modo demostración, permite alternar rápidamente entre los 5 roles para comprobar la experiencia y restricciones de cada perfil.

---

### D. Interfaz de Usuario y Navegación

#### [NEW] [UsuariosModule.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/usuarios/UsuariosModule.tsx)
- Nuevo módulo administrativo accesible solo para `ADMIN_PLATAFORMA` y `GERENTE_TH`:
  - **KPIs**: Total usuarios, Activos, Inactivos, Distribución por rol.
  - **Barra de herramientas**: Búsqueda por nombre/correo, filtro por rol, filtro por estado, botón "+ Incorporar Usuario".
  - **Tabla de Usuarios**:
    - Nombre, correo, teléfono, cargo.
    - Badge estilizado del Rol (púrpura, azul, esmeralda, ámbar, índigo).
    - Estado (Activo / Inactivo con switch o botón).
    - Fecha de alta y último acceso.
    - Acciones: Asignar/Modificar Rol, Cambiar Contraseña, Activar/Desactivar.
  - **Modal "Incorporar Nuevo Usuario"**:
    - Campos: Nombre Completo, Correo Corporativo, Contraseña Inicial, Selección de Rol (con descripción de responsabilidades), Teléfono y Cargo.
    - Validación y feedback inmediato (Toast).
  - **Modal "Modificar Rol"**:
    - Selector del nuevo rol con explicación del impacto y confirmación.

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/layout/Sidebar.tsx)
- Agregar nuevo grupo de navegación: `SEGURIDAD & ADMINISTRACIÓN`
- Agregar item: `usuarios` ("Gestión de Usuarios & Roles", icono `ShieldCheck` / `Users2`, badge `Admin`).
- Condicionar la visibilidad del grupo/item mediante `canManageUsers`.
- Condicionar o adaptar los items accesibles según los permisos de cada rol.

#### [MODIFY] [Header.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/components/layout/Header.tsx)
- Desplegar el badge del rol oficial con el color correspondiente.
- Título y descripción para la pestaña `usuarios`.
- Si está en modo demostración, mostrar un selector rápido de perfil de prueba para validar el comportamiento de los 5 roles.

#### [MODIFY] [App.tsx](file:///c:/Users/asuarez/Documents/GitHub/Antigravity/Aplicacion%20TH/src/App.tsx)
- Incorporar renderizado de `activeTab === 'usuarios' && <UsuariosModule />`.
- Guardián de ruta: Si un rol no autorizado intenta navegar a `usuarios`, redirigir al `dashboard`.

---

## 3. Plan de Verificación

### Pruebas de Base de Datos y Backend
1. Ejecutar el script DDL y de funciones en PostgreSQL (InsForge DB) vía MCP `run-raw-sql`.
2. Verificar la inserción de los 5 roles en `public.roles`.
3. Probar la creación de un usuario con `sp_crear_usuario` y confirmar que puede autenticarse con `signInWithPassword`.
4. Probar la reasignación de rol con `sp_asignar_rol_usuario` y verificar la sincronización con `auth.users.profile`.
5. Verificar el funcionamiento del trigger `updated_at`.

### Pruebas de Interfaz de Usuario y Permisos
1. Iniciar sesión con `asuarez@ponce-benzo.com` y comprobar que se reconoce como `Administrador de la plataforma`.
2. Verificar que el tab **Gestión de Usuarios & Roles** aparece en el Sidebar.
3. Probar la creación de un nuevo usuario con cada uno de los roles:
   - Gerente de TH
   - Coordinador de Compensación
   - Coordinador de Reclutamiento
   - Especialista de reclutamiento
4. Probar modificar el rol de un usuario existente y cambiar su estado activo/inactivo.
5. Iniciar sesión o simular el rol de `Coordinador de Compensación` / `Especialista de reclutamiento` y verificar que el tab de usuarios **no** está visible y el acceso está bloqueado.
6. Validar que la compilación TypeScript (`tsc`) y el build de Vite pasen sin errores.
