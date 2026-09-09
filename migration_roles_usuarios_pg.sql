-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Migración: Roles y Perfiles de Usuarios
-- Dialecto: PostgreSQL (InsForge DB - TH_PB)
-- ====================================================================================

-- 1. TABLA: roles
CREATE TABLE IF NOT EXISTS public.roles (
    role_id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    permite_gestion_usuarios BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(30) DEFAULT 'brand',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger updated_at para roles
DROP TRIGGER IF EXISTS trg_roles_updated_at ON public.roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar los 5 roles solicitados
INSERT INTO public.roles (codigo, nombre, descripcion, permite_gestion_usuarios, color)
VALUES
  (
    'ADMIN_PLATAFORMA',
    'Administrador de la plataforma',
    'Control total técnico y operativo del sistema, configuración corporativa y gestión completa de usuarios y accesos.',
    TRUE,
    'purple'
  ),
  (
    'GERENTE_TH',
    'Gerente de TH',
    'Dirección estratégica de Talento Humano. Autorizado para incorporar nuevos usuarios a la plataforma y asignar o modificar roles.',
    TRUE,
    'blue'
  ),
  (
    'COORD_COMPENSACION',
    'Coordinador de Compensación',
    'Gestión integral de tabuladores salariales, bandas salariales (80%-120%), evaluación de equidad interna y análisis de costos.',
    FALSE,
    'emerald'
  ),
  (
    'COORD_RECLUTAMIENTO',
    'Coordinador de Reclutamiento',
    'Liderazgo de procesos de captación, catálogo de cargos, denominaciones de cargos (DC) y especificación de perfiles de competencias (PC).',
    FALSE,
    'amber'
  ),
  (
    'ESPEC_RECLUTAMIENTO',
    'Especialista de reclutamiento',
    'Operación táctica de selección: Ficha de empleados (altas e ingresos), perfiles de competencias y consulta de dependencias en organigrama.',
    FALSE,
    'indigo'
  )
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  permite_gestion_usuarios = EXCLUDED.permite_gestion_usuarios,
  color = EXCLUDED.color,
  updated_at = CURRENT_TIMESTAMP;

-- 2. TABLA: usuarios (Perfiles vinculados con auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
    usuario_id SERIAL PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    rol_codigo VARCHAR(50) NOT NULL REFERENCES public.roles(codigo) ON UPDATE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    telefono VARCHAR(50),
    cargo VARCHAR(100),
    creado_por_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_codigo ON public.usuarios(rol_codigo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);

-- Trigger updated_at para usuarios
DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. VISTA: vw_usuarios_roles
CREATE OR REPLACE VIEW public.vw_usuarios_roles AS
SELECT 
    u.usuario_id,
    u.auth_user_id,
    u.email,
    u.nombre,
    u.rol_codigo,
    r.nombre AS rol_nombre,
    r.descripcion AS rol_descripcion,
    r.permite_gestion_usuarios,
    r.color AS rol_color,
    u.activo,
    u.telefono,
    u.cargo,
    u.creado_por_id,
    u.ultimo_acceso,
    u.created_at,
    u.updated_at
FROM public.usuarios u
INNER JOIN public.roles r ON u.rol_codigo = r.codigo;

-- 4. PROCEDIMIENTO: sp_crear_usuario
-- Permite que Administrador de la plataforma o Gerente de TH incorporen nuevos usuarios
CREATE OR REPLACE FUNCTION sp_crear_usuario(
    p_email VARCHAR,
    p_password VARCHAR,
    p_nombre VARCHAR,
    p_rol_codigo VARCHAR,
    p_telefono VARCHAR DEFAULT NULL,
    p_cargo VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_rol_nombre VARCHAR(100);
    v_hashed_pw TEXT;
    v_caller_role VARCHAR(50);
    v_caller_id UUID;
    v_existing_id UUID;
    v_result JSONB;
BEGIN
    -- Validar email
    IF p_email IS NULL OR position('@' in p_email) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'El formato del correo electrónico es inválido.');
    END IF;

    -- Validar longitud de contraseña
    IF p_password IS NULL OR length(trim(p_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'La contraseña debe tener al menos 6 caracteres.');
    END IF;

    -- Validar que el rol exista
    SELECT nombre INTO v_rol_nombre
    FROM public.roles
    WHERE codigo = p_rol_codigo AND activo = TRUE;

    IF v_rol_nombre IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'El rol seleccionado no existe o está inactivo.');
    END IF;

    -- Validar si el email ya existe
    SELECT id INTO v_existing_id
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email));

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ya existe un usuario registrado con este correo electrónico.');
    END IF;

    -- Validar permisos de quien ejecuta:
    -- Solo ADMIN_PLATAFORMA y GERENTE_TH pueden incorporar usuarios
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT rol_codigo INTO v_caller_role
        FROM public.usuarios
        WHERE auth_user_id = v_caller_id;

        -- Si no está registrado en public.usuarios o su rol no tiene permiso:
        IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('ADMIN_PLATAFORMA', 'GERENTE_TH') THEN
            RETURN jsonb_build_object('success', false, 'message', 'No tiene permisos para incorporar usuarios. Solo el Administrador de la plataforma y el Gerente de TH pueden realizar esta acción.');
        END IF;
    END IF;

    -- Generar UUID nuevo y hash de clave bcrypt
    v_new_id := gen_random_uuid();
    v_hashed_pw := replace(crypt(trim(p_password), gen_salt('bf', 10)), '$2a$', '$2b$');

    -- Insertar en auth.users (email verificado automáticamente para que pueda iniciar sesión de inmediato)
    INSERT INTO auth.users (
        id,
        email,
        password,
        email_verified,
        is_project_admin,
        is_anonymous,
        profile,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        v_new_id,
        lower(trim(p_email)),
        v_hashed_pw,
        TRUE,
        (p_rol_codigo = 'ADMIN_PLATAFORMA'),
        FALSE,
        jsonb_build_object(
            'name', trim(p_nombre),
            'role', v_rol_nombre,
            'rol_codigo', p_rol_codigo,
            'cargo', p_cargo
        ),
        '{}'::jsonb,
        NOW(),
        NOW()
    );

    -- Insertar en public.usuarios
    INSERT INTO public.usuarios (
        auth_user_id,
        email,
        nombre,
        rol_codigo,
        activo,
        telefono,
        cargo,
        creado_por_id,
        created_at,
        updated_at
    ) VALUES (
        v_new_id,
        lower(trim(p_email)),
        trim(p_nombre),
        p_rol_codigo,
        TRUE,
        p_telefono,
        p_cargo,
        v_caller_id,
        NOW(),
        NOW()
    );

    v_result := jsonb_build_object(
        'success', true,
        'user_id', v_new_id,
        'email', lower(trim(p_email)),
        'nombre', trim(p_nombre),
        'rol_codigo', p_rol_codigo,
        'rol_nombre', v_rol_nombre,
        'message', 'Usuario incorporado con éxito a la plataforma.'
    );

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. PROCEDIMIENTO: sp_asignar_rol_usuario
-- Permite que Administrador de la plataforma o Gerente de TH asignen o modifiquen el rol
CREATE OR REPLACE FUNCTION sp_asignar_rol_usuario(
    p_auth_user_id UUID,
    p_nuevo_rol_codigo VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rol_nombre VARCHAR(100);
    v_caller_role VARCHAR(50);
    v_caller_id UUID;
BEGIN
    -- Validar que el rol exista
    SELECT nombre INTO v_rol_nombre
    FROM public.roles
    WHERE codigo = p_nuevo_rol_codigo AND activo = TRUE;

    IF v_rol_nombre IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'El rol especificado no existe o está inactivo.');
    END IF;

    -- Validar permisos de quien ejecuta
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT rol_codigo INTO v_caller_role
        FROM public.usuarios
        WHERE auth_user_id = v_caller_id;

        IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('ADMIN_PLATAFORMA', 'GERENTE_TH') THEN
            RETURN jsonb_build_object('success', false, 'message', 'No tiene permisos para modificar o asignar roles. Solo el Administrador de la plataforma y el Gerente de TH pueden realizar esta acción.');
        END IF;
    END IF;

    -- Actualizar public.usuarios
    UPDATE public.usuarios
    SET rol_codigo = p_nuevo_rol_codigo,
        updated_at = NOW()
    WHERE auth_user_id = p_auth_user_id;

    -- Sincronizar auth.users.profile
    UPDATE auth.users
    SET profile = jsonb_set(
            jsonb_set(COALESCE(profile, '{}'::jsonb), '{role}', to_jsonb(v_rol_nombre)),
            '{rol_codigo}', to_jsonb(p_nuevo_rol_codigo)
        ),
        is_project_admin = (p_nuevo_rol_codigo = 'ADMIN_PLATAFORMA'),
        updated_at = NOW()
    WHERE id = p_auth_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_auth_user_id,
        'nuevo_rol_codigo', p_nuevo_rol_codigo,
        'nuevo_rol_nombre', v_rol_nombre,
        'message', 'Rol actualizado con éxito.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 6. PROCEDIMIENTO: sp_cambiar_estado_usuario
CREATE OR REPLACE FUNCTION sp_cambiar_estado_usuario(
    p_auth_user_id UUID,
    p_activo BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role VARCHAR(50);
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT rol_codigo INTO v_caller_role
        FROM public.usuarios
        WHERE auth_user_id = v_caller_id;

        IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('ADMIN_PLATAFORMA', 'GERENTE_TH') THEN
            RETURN jsonb_build_object('success', false, 'message', 'No tiene permisos para modificar el estado de usuarios.');
        END IF;

        -- Evitar que un usuario se desactive a sí mismo
        IF v_caller_id = p_auth_user_id AND p_activo = FALSE THEN
            RETURN jsonb_build_object('success', false, 'message', 'No puede desactivar su propia cuenta activa.');
        END IF;
    END IF;

    UPDATE public.usuarios
    SET activo = p_activo,
        updated_at = NOW()
    WHERE auth_user_id = p_auth_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_auth_user_id,
        'activo', p_activo,
        'message', CASE WHEN p_activo THEN 'Usuario activado exitosamente.' ELSE 'Usuario suspendido exitosamente.' END
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 7. PROCEDIMIENTO: sp_admin_cambiar_password
CREATE OR REPLACE FUNCTION sp_admin_cambiar_password(
    p_auth_user_id UUID,
    p_new_password VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role VARCHAR(50);
    v_caller_id UUID;
    v_hashed_pw TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT rol_codigo INTO v_caller_role
        FROM public.usuarios
        WHERE auth_user_id = v_caller_id;

        IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('ADMIN_PLATAFORMA', 'GERENTE_TH') THEN
            RETURN jsonb_build_object('success', false, 'message', 'No tiene permisos para restablecer contraseñas de usuarios.');
        END IF;
    END IF;

    IF length(trim(p_new_password)) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'La nueva contraseña debe tener al menos 6 caracteres.');
    END IF;

    v_hashed_pw := replace(crypt(trim(p_new_password), gen_salt('bf', 10)), '$2a$', '$2b$');

    UPDATE auth.users
    SET password = v_hashed_pw,
        updated_at = NOW()
    WHERE id = p_auth_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Contraseña actualizada con éxito.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 8. BOOTSTRAP: Registrar y sincronizar usuario actual (asuarez@ponce-benzo.com)
INSERT INTO public.usuarios (
    auth_user_id,
    email,
    nombre,
    rol_codigo,
    activo,
    cargo
)
SELECT 
    id,
    lower(email),
    COALESCE(profile->>'name', 'Albin Suárez'),
    'ADMIN_PLATAFORMA',
    TRUE,
    'Administrador de la plataforma'
FROM auth.users
WHERE email = 'asuarez@ponce-benzo.com'
ON CONFLICT (auth_user_id) DO UPDATE SET
    rol_codigo = 'ADMIN_PLATAFORMA',
    activo = TRUE,
    updated_at = NOW();

-- Sincronizar profile en auth.users
UPDATE auth.users
SET profile = jsonb_set(
    jsonb_set(COALESCE(profile, '{}'::jsonb), '{role}', '"Administrador de la plataforma"'::jsonb),
    '{rol_codigo}', '"ADMIN_PLATAFORMA"'::jsonb
),
is_project_admin = TRUE,
updated_at = NOW()
WHERE email = 'asuarez@ponce-benzo.com';
