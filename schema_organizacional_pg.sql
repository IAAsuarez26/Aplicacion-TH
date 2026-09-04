-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL: Estructura Organizacional, Empresas, Tabuladores Salariales,
--             Tipos de Costos, Centros de Costos y Empleados
-- Dialecto: PostgreSQL (PL/pgSQL) - InsForge DB (TH_PB)
-- ====================================================================================

-- ====================================================================================
-- 1. ELIMINACIÓN PREVIA DE OBJETOS (Ejecución limpia e idempotente con CASCADE)
-- ====================================================================================

DROP VIEW IF EXISTS vw_organigrama_completo CASCADE;
DROP VIEW IF EXISTS vw_resumen_responsables_area CASCADE;
DROP VIEW IF EXISTS vw_tabulador_empresas_resumen CASCADE;
DROP VIEW IF EXISTS tipos_costos CASCADE;
DROP VIEW IF EXISTS "TipoCostos" CASCADE;
DROP VIEW IF EXISTS centros_costo CASCADE;
DROP VIEW IF EXISTS "CentrosCostos" CASCADE;
DROP VIEW IF EXISTS "Denominaciones_Cargos" CASCADE;
DROP VIEW IF EXISTS "Perfiles_Competencias" CASCADE;

DROP FUNCTION IF EXISTS sp_obtener_subordinados(INT) CASCADE;
DROP FUNCTION IF EXISTS fn_evaluar_posicion_salarial(VARCHAR, VARCHAR, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS historial_cargos_departamentos CASCADE;
DROP TABLE IF EXISTS empleados CASCADE;
DROP TABLE IF EXISTS departamentos CASCADE;
DROP TABLE IF EXISTS gerencias CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS cargos CASCADE;
DROP TABLE IF EXISTS perfiles_competencias CASCADE;
DROP TABLE IF EXISTS denominaciones_cargos CASCADE;
DROP TABLE IF EXISTS centros_costos CASCADE;
DROP TABLE IF EXISTS tipo_costos CASCADE;
DROP TABLE IF EXISTS tabulador_empresas CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;

-- ====================================================================================
-- 2. FUNCIÓN DE TRIGGER REUTILIZABLE PARA ACTUALIZAR TIMESTAMP (updated_at)
-- ====================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 3. TABLA: empresas (Maestro de Filiales y Compañías)
-- ====================================================================================

CREATE TABLE empresas (
    empresa_id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    razon_social VARCHAR(200) NOT NULL,
    nombre_corto VARCHAR(100),
    rif VARCHAR(20) UNIQUE,
    direccion TEXT,
    estado_region VARCHAR(100),
    localidad VARCHAR(100),
    municipio VARCHAR(100),
    ciudad VARCHAR(100),
    zona_postal VARCHAR(20),
    fecha_registro DATE,
    fecha_fundacion DATE,
    rep_legal_ci VARCHAR(20),
    rep_legal_nombre VARCHAR(150),
    rep_legal_nacionalidad VARCHAR(50),
    rep_legal_cargo VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================================
-- 4. TABLA: tabulador_empresas (Bandas Salariales por Empresa)
-- ====================================================================================

CREATE TABLE tabulador_empresas (
    tabulador_id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas (empresa_id) ON DELETE RESTRICT,
    codigo_empresa VARCHAR(10) NOT NULL REFERENCES empresas (codigo) ON DELETE RESTRICT ON UPDATE CASCADE,
    codigo_banda VARCHAR(10) NOT NULL,
    cargos_referencia TEXT NOT NULL,
    salario_minimo_80 NUMERIC(14, 4) NOT NULL,
    salario_medio_bajo_90 NUMERIC(14, 4) NOT NULL,
    salario_mediana_100 NUMERIC(14, 4) NOT NULL,
    salario_medio_alto_110 NUMERIC(14, 4) NOT NULL,
    salario_maximo_120 NUMERIC(14, 4) NOT NULL,
    progresion NUMERIC(8, 6) NOT NULL DEFAULT 0.000000,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_tabulador_empresa_banda UNIQUE (empresa_id, codigo_banda),
    CONSTRAINT chk_tabulador_salarios_positivos CHECK (
        salario_minimo_80 >= 0 AND
        salario_medio_bajo_90 >= 0 AND
        salario_mediana_100 >= 0 AND
        salario_medio_alto_110 >= 0 AND
        salario_maximo_120 >= 0 AND
        progresion >= 0
    ),
    CONSTRAINT chk_tabulador_escala_consistente CHECK (
        salario_minimo_80 <= salario_medio_bajo_90 AND
        salario_medio_bajo_90 <= salario_mediana_100 AND
        salario_mediana_100 <= salario_medio_alto_110 AND
        salario_medio_alto_110 <= salario_maximo_120
    )
);

CREATE TRIGGER trg_tabulador_empresas_updated_at
BEFORE UPDATE ON tabulador_empresas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================================
-- 5. TABLAS DE COSTOS (Tipos de Costo y Centros de Costo)
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Tabla: tipo_costos (MOD, MOI, Gastos) - Origen: TiposdeCostos.xlsx
-- ------------------------------------------------------------------------------------
CREATE TABLE tipo_costos (
    tipo_costo_id SERIAL PRIMARY KEY,
    codigo_tc VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_tipo_costos_updated_at
BEFORE UPDATE ON tipo_costos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: centros_costos (Centros de Costo 01-15) - Origen: Centros de Costos.xlsx
-- ------------------------------------------------------------------------------------
CREATE TABLE centros_costos (
    centro_costo_id SERIAL PRIMARY KEY,
    codigo_cc VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_centros_costos_updated_at
BEFORE UPDATE ON centros_costos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: denominaciones_cargos (Catálogo Maestro de Denominaciones de Cargos)
-- Origen: Denominaciones_Cargos.xlsx
-- ------------------------------------------------------------------------------------
CREATE TABLE denominaciones_cargos (
    denominacion_cargo_id SERIAL PRIMARY KEY,
    codigo_dc VARCHAR(20) NOT NULL UNIQUE,
    denominacion VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_denominaciones_cargos_updated_at
BEFORE UPDATE ON denominaciones_cargos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW "Denominaciones_Cargos" AS SELECT * FROM denominaciones_cargos;

-- ------------------------------------------------------------------------------------
-- Tabla: perfiles_competencias (Catálogo Maestro de Perfiles de Competencia)
-- Origen: Perfiles_Competencias.xlsx
-- ------------------------------------------------------------------------------------
CREATE TABLE perfiles_competencias (
    perfil_competencia_id SERIAL PRIMARY KEY,
    codigo_pc VARCHAR(20) NOT NULL UNIQUE,
    perfil VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_perfiles_competencias_updated_at
BEFORE UPDATE ON perfiles_competencias
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW "Perfiles_Competencias" AS SELECT * FROM perfiles_competencias;

-- ====================================================================================
-- 6. TABLAS DE ESTRUCTURA ORGANIZACIONAL
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Tabla: cargos (Catálogo de Puestos/Títulos de la Organización)
-- ------------------------------------------------------------------------------------
CREATE TABLE cargos (
    cargo_id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    codigo_dc VARCHAR(20) NULL REFERENCES denominaciones_cargos (codigo_dc) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_cargos_updated_at
BEFORE UPDATE ON cargos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: direcciones (Nivel 1 de la Jerarquía Organizacional, relacionada con Empresa)
-- ------------------------------------------------------------------------------------
CREATE TABLE direcciones (
    direccion_id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas (empresa_id) ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    director_id INT NULL, -- FK a empleados agregada posteriormente
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_direcciones_updated_at
BEFORE UPDATE ON direcciones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: gerencias (Nivel 2 de la Jerarquía Organizacional)
-- ------------------------------------------------------------------------------------
CREATE TABLE gerencias (
    gerencia_id SERIAL PRIMARY KEY,
    direccion_id INT NULL REFERENCES direcciones (direccion_id) ON DELETE RESTRICT,
    codigo_direccion VARCHAR(20) NULL REFERENCES direcciones (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    gerente_id INT NULL, -- FK a empleados agregada posteriormente
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_gerencias_updated_at
BEFORE UPDATE ON gerencias
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: departamentos (Nivel 3 de la Jerarquía Organizacional, con FK a Centros de Costo)
-- ------------------------------------------------------------------------------------
CREATE TABLE departamentos (
    departamento_id SERIAL PRIMARY KEY,
    gerencia_id INT NULL REFERENCES gerencias (gerencia_id) ON DELETE RESTRICT,
    codigo_gerencia VARCHAR(20) NULL REFERENCES gerencias (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_cc VARCHAR(20) NULL REFERENCES centros_costos (codigo_cc) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    jefe_departamento_id INT NULL, -- FK a empleados agregada posteriormente
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_departamentos_updated_at
BEFORE UPDATE ON departamentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: empleados (Ficha Maestra del Personal con Tabulador Salarial y Tipo de Costo)
-- ------------------------------------------------------------------------------------
CREATE TABLE empleados (
    empleado_id SERIAL PRIMARY KEY,
    codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
    documento_identidad VARCHAR(20) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    email_corporativo VARCHAR(150),
    telefono VARCHAR(30),
    codigo_cargo VARCHAR(20) NOT NULL REFERENCES cargos (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    cargo_id INT NULL REFERENCES cargos (cargo_id) ON DELETE RESTRICT,
    codigo_departamento VARCHAR(20) NOT NULL REFERENCES departamentos (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    departamento_id INT NULL REFERENCES departamentos (departamento_id) ON DELETE RESTRICT,
    codigo_tc VARCHAR(20) NULL REFERENCES tipo_costos (codigo_tc) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_pc VARCHAR(20) NULL REFERENCES perfiles_competencias (codigo_pc) ON UPDATE CASCADE ON DELETE RESTRICT,
    genero VARCHAR(20) NULL CHECK (genero IS NULL OR genero IN ('Mujer', 'Hombre')),
    sede VARCHAR(100) NULL,
    tabulador_id INT NULL REFERENCES tabulador_empresas (tabulador_id) ON DELETE SET NULL,
    di_supervisor VARCHAR(20) NULL REFERENCES empleados (documento_identidad) ON UPDATE CASCADE ON DELETE RESTRICT,
    di_evaluador VARCHAR(20) NULL REFERENCES empleados (documento_identidad) ON UPDATE CASCADE ON DELETE SET NULL,
    fecha_ingreso DATE NOT NULL,
    estado_laboral VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado_laboral IN ('ACTIVO', 'INACTIVO', 'VACACIONES', 'LICENCIA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_empleados_updated_at
BEFORE UPDATE ON empleados
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: historial_cargos_departamentos (Control Histórico de Traslados y Ascensos)
-- ------------------------------------------------------------------------------------
CREATE TABLE historial_cargos_departamentos (
    historial_id SERIAL PRIMARY KEY,
    empleado_id INT NOT NULL REFERENCES empleados (empleado_id) ON DELETE CASCADE,
    cargo_id INT NOT NULL REFERENCES cargos (cargo_id) ON DELETE RESTRICT,
    departamento_id INT NOT NULL REFERENCES departamentos (departamento_id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    motivo_cambio VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- 7. DEFINICIÓN DE CLAVES FORÁNEAS DE RESPONSABLES POR ÁREA
-- ====================================================================================

ALTER TABLE direcciones ADD CONSTRAINT fk_direcciones_director
    FOREIGN KEY (director_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE gerencias ADD CONSTRAINT fk_gerencias_gerente
    FOREIGN KEY (gerente_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE departamentos ADD CONSTRAINT fk_departamentos_jefe
    FOREIGN KEY (jefe_departamento_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

-- ====================================================================================
-- 8. ÍNDICES DE RENDIMIENTO
-- ====================================================================================

CREATE INDEX idx_empresas_codigo ON empresas (codigo);
CREATE INDEX idx_empresas_rif ON empresas (rif) WHERE rif IS NOT NULL;
CREATE INDEX idx_empresas_activos ON empresas (activo) WHERE activo = TRUE;

CREATE INDEX idx_tabulador_empresa_id ON tabulador_empresas (empresa_id);
CREATE INDEX idx_tabulador_banda ON tabulador_empresas (codigo_banda);
CREATE INDEX idx_tabulador_activos ON tabulador_empresas (empresa_id, activo) WHERE activo = TRUE;

CREATE INDEX idx_tipo_costos_codigo ON tipo_costos (codigo_tc);
CREATE INDEX idx_tipo_costos_activos ON tipo_costos (activo) WHERE activo = TRUE;

CREATE INDEX idx_centros_costos_codigo ON centros_costos (codigo_cc);
CREATE INDEX idx_centros_costos_activos ON centros_costos (activo) WHERE activo = TRUE;

CREATE INDEX idx_denominaciones_cargos_codigo_dc ON denominaciones_cargos (codigo_dc);
CREATE INDEX idx_denominaciones_cargos_activos ON denominaciones_cargos (activo) WHERE activo = TRUE;

CREATE INDEX idx_perfiles_competencias_codigo_pc ON perfiles_competencias (codigo_pc);
CREATE INDEX idx_perfiles_competencias_activos ON perfiles_competencias (activo) WHERE activo = TRUE;

CREATE INDEX idx_cargos_codigo_dc ON cargos (codigo_dc);

CREATE INDEX idx_direcciones_empresa_id ON direcciones (empresa_id);
CREATE INDEX idx_gerencias_direccion_id ON gerencias (direccion_id);
CREATE INDEX idx_departamentos_gerencia_id ON departamentos (gerencia_id);
CREATE INDEX idx_departamentos_codigo_cc ON departamentos (codigo_cc);

CREATE INDEX idx_empleados_departamento_id ON empleados (departamento_id);
CREATE INDEX idx_empleados_cargo_id ON empleados (cargo_id);
CREATE INDEX idx_empleados_codigo_tc ON empleados (codigo_tc);
CREATE INDEX idx_empleados_codigo_pc ON empleados (codigo_pc);
CREATE INDEX idx_empleados_genero ON empleados (genero);
CREATE INDEX idx_empleados_sede ON empleados (sede);
CREATE INDEX idx_empleados_tabulador_id ON empleados (tabulador_id) WHERE tabulador_id IS NOT NULL;
CREATE INDEX idx_empleados_di_supervisor ON empleados (di_supervisor);
CREATE INDEX idx_empleados_di_evaluador ON empleados (di_evaluador) WHERE di_evaluador IS NOT NULL;

-- ====================================================================================
-- 9. VISTAS DE CORRELACIÓN ORGANIZACIONAL Y SALARIAL
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Vista 1: vw_organigrama_completo
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_organigrama_completo AS
SELECT 
    e.empleado_id,
    e.codigo_empleado,
    e.documento_identidad,
    CONCAT(e.nombres, ' ', e.apellidos) AS nombre_completo_empleado,
    e.genero,
    e.sede,
    e.email AS email_empleado,
    e.telefono AS telefono_empleado,
    e.estado_laboral,
    e.fecha_ingreso,
    
    -- Empresa
    emp.empresa_id,
    emp.codigo AS empresa_codigo,
    emp.razon_social AS empresa_razon_social,
    emp.nombre_corto AS empresa_nombre_corto,
    
    -- Cargo y Denominación
    c.cargo_id,
    c.codigo AS cargo_codigo,
    c.nombre AS cargo_nombre,
    c.codigo_dc,
    dc.denominacion AS cargo_denominacion,

    -- Perfil de Competencias
    e.codigo_pc,
    pc.perfil AS perfil_competencia_nombre,
    
    -- Tabulador / Banda Salarial
    t.tabulador_id,
    t.codigo_banda AS banda_codigo,
    t.cargos_referencia AS banda_cargos_referencia,
    t.salario_mediana_100 AS salario_mediana_banda,
    t.salario_minimo_80 AS salario_minimo_banda,
    t.salario_maximo_120 AS salario_maximo_banda,
    
    -- Departamento, Centro de Costo y Jefe
    dep.departamento_id,
    dep.codigo AS departamento_codigo,
    dep.nombre AS departamento_nombre,
    dep.codigo_cc,
    cc.descripcion AS centro_costo_descripcion,
    e.codigo_tc,
    tc.nombre AS tipo_costo_nombre,
    tc.descripcion AS tipo_costo_descripcion,
    dep.jefe_departamento_id,
    CONCAT(jefe_dep.nombres, ' ', jefe_dep.apellidos) AS jefe_departamento_nombre,
    
    -- Gerencia y su Gerente
    g.gerencia_id,
    g.codigo AS gerencia_codigo,
    g.nombre AS gerencia_nombre,
    g.gerente_id,
    CONCAT(ger.nombres, ' ', ger.apellidos) AS gerente_area_nombre,
    
    -- Dirección y su Director
    d.direccion_id,
    d.codigo AS direccion_codigo,
    d.nombre AS direccion_nombre,
    d.director_id,
    CONCAT(dir.nombres, ' ', dir.apellidos) AS director_ejecutivo_nombre,
    
    -- Supervisor Directo (Mando Inmediato)
    e.di_supervisor,
    CONCAT(sup.nombres, ' ', sup.apellidos) AS supervisor_directo_nombre,
    sup.email AS supervisor_directo_email,

    -- Evaluador de Desempeño
    e.di_evaluador,
    CONCAT(ev.nombres, ' ', ev.apellidos) AS evaluador_especifico_nombre,
    ev.email AS evaluador_especifico_email,

    -- Evaluador Efectivo
    COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos)) AS evaluador_efectivo_nombre,
    COALESCE(ev.email, sup.email) AS evaluador_efectivo_email,
    CASE 
        WHEN e.di_evaluador IS NOT NULL AND e.di_evaluador <> e.di_supervisor THEN 'EVALUADOR_ESPECIAL'
        ELSE 'SUPERVISOR_DIRECTO'
    END AS tipo_evaluador

FROM empleados e
LEFT JOIN cargos c ON e.codigo_cargo = c.codigo
LEFT JOIN denominaciones_cargos dc ON c.codigo_dc = dc.codigo_dc
LEFT JOIN perfiles_competencias pc ON e.codigo_pc = pc.codigo_pc
LEFT JOIN departamentos dep ON e.codigo_departamento = dep.codigo
LEFT JOIN centros_costos cc ON dep.codigo_cc = cc.codigo_cc
LEFT JOIN tipo_costos tc ON e.codigo_tc = tc.codigo_tc
LEFT JOIN gerencias g ON dep.codigo_gerencia = g.codigo
LEFT JOIN direcciones d ON g.codigo_direccion = d.codigo
LEFT JOIN empresas emp ON d.empresa_id = emp.empresa_id
LEFT JOIN tabulador_empresas t ON e.tabulador_id = t.tabulador_id
LEFT JOIN empleados sup ON e.di_supervisor = sup.documento_identidad
LEFT JOIN empleados ev ON e.di_evaluador = ev.documento_identidad
LEFT JOIN empleados jefe_dep ON dep.jefe_departamento_id = jefe_dep.empleado_id
LEFT JOIN empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN empleados dir ON d.director_id = dir.empleado_id;

-- ------------------------------------------------------------------------------------
-- Vista 2: vw_tabulador_empresas_resumen
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_tabulador_empresas_resumen AS
SELECT 
    t.tabulador_id,
    t.empresa_id,
    e.codigo AS codigo_empresa,
    e.nombre_corto AS nombre_empresa,
    e.razon_social,
    t.codigo_banda,
    t.cargos_referencia,
    t.salario_minimo_80,
    t.salario_medio_bajo_90,
    t.salario_mediana_100,
    t.salario_medio_alto_110,
    t.salario_maximo_120,
    ROUND(t.salario_maximo_120 - t.salario_minimo_80, 4) AS amplitud_salarial,
    ROUND(((t.salario_maximo_120 - t.salario_minimo_80) / NULLIF(t.salario_minimo_80, 0)) * 100, 2) AS porcentaje_amplitud,
    ROUND(t.progresion * 100, 2) AS porcentaje_progresion,
    t.activo,
    t.updated_at
FROM tabulador_empresas t
INNER JOIN empresas e ON t.empresa_id = e.empresa_id;

-- ------------------------------------------------------------------------------------
-- Vistas 3 y 4: Compatibilidad de Vistas de Costos
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW tipos_costos AS SELECT * FROM tipo_costos;
CREATE OR REPLACE VIEW "TipoCostos" AS SELECT tipo_costo_id, codigo_tc AS "Codigo_TC", nombre AS "Nombre", descripcion AS "Descripcion", activo AS "Activo", created_at, updated_at FROM tipo_costos;
CREATE OR REPLACE VIEW centros_costo AS SELECT * FROM centros_costos;
CREATE OR REPLACE VIEW "CentrosCostos" AS SELECT centro_costo_id, codigo_cc AS "Codigo_CC", descripcion AS "Descripcion", activo AS "Activo", created_at, updated_at FROM centros_costos;

-- ====================================================================================
-- 10. FUNCIONES ALMACENADAS (STORED PROCEDURES / RPC)
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Procedimiento: sp_obtener_subordinados (Recursividad Jerárquica Directa e Indirecta)
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sp_obtener_subordinados(p_supervisor_id INT)
RETURNS TABLE (
    nivel_jerarquico INT,
    empleado_id INT,
    codigo_empleado VARCHAR,
    nombre_completo TEXT,
    cargo VARCHAR,
    departamento VARCHAR,
    gerencia VARCHAR,
    direccion VARCHAR,
    supervisor_inmediato TEXT,
    evaluador_efectivo TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE organigrama_recursivo AS (
        -- Nivel 1: Subordinados Directos
        SELECT 
            e.empleado_id,
            e.codigo_empleado,
            e.documento_identidad,
            e.nombres,
            e.apellidos,
            e.codigo_cargo,
            e.codigo_departamento,
            e.di_supervisor,
            e.di_evaluador,
            1 AS nivel_jerarquico
        FROM empleados e
        INNER JOIN empleados s ON e.di_supervisor = s.documento_identidad
        WHERE s.empleado_id = p_supervisor_id AND e.estado_laboral = 'ACTIVO'

        UNION ALL

        -- Niveles N: Subordinados Indirectos (Recursión)
        SELECT 
            sub.empleado_id,
            sub.codigo_empleado,
            sub.documento_identidad,
            sub.nombres,
            sub.apellidos,
            sub.codigo_cargo,
            sub.codigo_departamento,
            sub.di_supervisor,
            sub.di_evaluador,
            org.nivel_jerarquico + 1
        FROM empleados sub
        INNER JOIN organigrama_recursivo org ON sub.di_supervisor = org.documento_identidad
        WHERE sub.estado_laboral = 'ACTIVO'
    )
    SELECT 
        o.nivel_jerarquico,
        o.empleado_id,
        o.codigo_empleado,
        CONCAT(o.nombres, ' ', o.apellidos)::TEXT AS nombre_completo,
        c.nombre::VARCHAR AS cargo,
        dep.nombre::VARCHAR AS departamento,
        g.nombre::VARCHAR AS gerencia,
        d.nombre::VARCHAR AS direccion,
        CONCAT(sup.nombres, ' ', sup.apellidos)::TEXT AS supervisor_inmediato,
        COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos))::TEXT AS evaluador_efectivo
    FROM organigrama_recursivo o
    LEFT JOIN cargos c ON o.codigo_cargo = c.codigo
    LEFT JOIN departamentos dep ON o.codigo_departamento = dep.codigo
    LEFT JOIN gerencias g ON dep.codigo_gerencia = g.codigo
    LEFT JOIN direcciones d ON g.codigo_direccion = d.codigo
    LEFT JOIN empleados sup ON o.di_supervisor = sup.documento_identidad
    LEFT JOIN empleados ev ON o.di_evaluador = ev.documento_identidad
    ORDER BY o.nivel_jerarquico, o.apellidos, o.nombres;
END;
$$;

