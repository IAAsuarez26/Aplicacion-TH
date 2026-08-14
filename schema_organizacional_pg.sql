-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL: Estructura Organizacional, Empresas, Tabuladores Salariales y Empleados
-- Dialecto: PostgreSQL (PL/pgSQL) - InsForge DB (TH_PB)
-- ====================================================================================

-- ====================================================================================
-- 1. ELIMINACIÓN PREVIA DE OBJETOS (Ejecución limpia e idempotente con CASCADE)
-- ====================================================================================

DROP VIEW IF EXISTS vw_organigrama_completo CASCADE;
DROP VIEW IF EXISTS vw_resumen_responsables_area CASCADE;
DROP VIEW IF EXISTS vw_tabulador_empresas_resumen CASCADE;

DROP FUNCTION IF EXISTS sp_obtener_subordinados(INT) CASCADE;
DROP FUNCTION IF EXISTS fn_evaluar_posicion_salarial(VARCHAR, VARCHAR, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS historial_cargos_departamentos CASCADE;
DROP TABLE IF EXISTS empleados CASCADE;
DROP TABLE IF EXISTS departamentos CASCADE;
DROP TABLE IF EXISTS gerencias CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS cargos CASCADE;
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
-- 5. TABLAS DE ESTRUCTURA ORGANIZACIONAL
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Tabla: cargos (Catálogo de Puestos/Títulos de la Organización)
-- ------------------------------------------------------------------------------------
CREATE TABLE cargos (
    cargo_id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
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
    direccion_id INT NOT NULL REFERENCES direcciones (direccion_id) ON DELETE RESTRICT,
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
-- Tabla: departamentos (Nivel 3 de la Jerarquía Organizacional)
-- ------------------------------------------------------------------------------------
CREATE TABLE departamentos (
    departamento_id SERIAL PRIMARY KEY,
    gerencia_id INT NOT NULL REFERENCES gerencias (gerencia_id) ON DELETE RESTRICT,
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
-- Tabla: empleados (Ficha Maestra del Personal con Tabulador Salarial Asignado)
-- ------------------------------------------------------------------------------------
CREATE TABLE empleados (
    empleado_id SERIAL PRIMARY KEY,
    codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
    documento_identidad VARCHAR(20) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    cargo_id INT NOT NULL REFERENCES cargos (cargo_id) ON DELETE RESTRICT,
    departamento_id INT NOT NULL REFERENCES departamentos (departamento_id) ON DELETE RESTRICT,
    tabulador_id INT NULL REFERENCES tabulador_empresas (tabulador_id) ON DELETE SET NULL,
    supervisor_directo_id INT REFERENCES empleados (empleado_id) ON DELETE RESTRICT,
    evaluador_id INT REFERENCES empleados (empleado_id) ON DELETE SET NULL,
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
-- 6. DEFINICIÓN DE CLAVES FORÁNEAS DE RESPONSABLES POR ÁREA
-- ====================================================================================

ALTER TABLE direcciones ADD CONSTRAINT fk_direcciones_director
    FOREIGN KEY (director_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE gerencias ADD CONSTRAINT fk_gerencias_gerente
    FOREIGN KEY (gerente_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE departamentos ADD CONSTRAINT fk_departamentos_jefe
    FOREIGN KEY (jefe_departamento_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

-- ====================================================================================
-- 7. ÍNDICES DE RENDIMIENTO
-- ====================================================================================

CREATE INDEX idx_empresas_codigo ON empresas (codigo);
CREATE INDEX idx_empresas_rif ON empresas (rif) WHERE rif IS NOT NULL;
CREATE INDEX idx_empresas_activos ON empresas (activo) WHERE activo = TRUE;

CREATE INDEX idx_tabulador_empresa_id ON tabulador_empresas (empresa_id);
CREATE INDEX idx_tabulador_banda ON tabulador_empresas (codigo_banda);
CREATE INDEX idx_tabulador_activos ON tabulador_empresas (empresa_id, activo) WHERE activo = TRUE;

CREATE INDEX idx_direcciones_empresa_id ON direcciones (empresa_id);
CREATE INDEX idx_gerencias_direccion_id ON gerencias (direccion_id);
CREATE INDEX idx_departamentos_gerencia_id ON departamentos (gerencia_id);

CREATE INDEX idx_empleados_departamento_id ON empleados (departamento_id);
CREATE INDEX idx_empleados_cargo_id ON empleados (cargo_id);
CREATE INDEX idx_empleados_tabulador_id ON empleados (tabulador_id) WHERE tabulador_id IS NOT NULL;
CREATE INDEX idx_empleados_supervisor_directo_id ON empleados (supervisor_directo_id);
CREATE INDEX idx_empleados_evaluador_id ON empleados (evaluador_id) WHERE evaluador_id IS NOT NULL;

-- ====================================================================================
-- 8. VISTAS DE CORRELACIÓN ORGANIZACIONAL Y SALARIAL
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
    e.email AS email_empleado,
    e.telefono AS telefono_empleado,
    e.estado_laboral,
    e.fecha_ingreso,
    
    -- Empresa
    emp.empresa_id,
    emp.codigo AS empresa_codigo,
    emp.razon_social AS empresa_razon_social,
    emp.nombre_corto AS empresa_nombre_corto,
    
    -- Cargo
    c.cargo_id,
    c.nombre AS cargo_nombre,
    
    -- Tabulador / Banda Salarial
    t.tabulador_id,
    t.codigo_banda AS banda_codigo,
    t.cargos_referencia AS banda_cargos_referencia,
    t.salario_mediana_100 AS salario_mediana_banda,
    t.salario_minimo_80 AS salario_minimo_banda,
    t.salario_maximo_120 AS salario_maximo_banda,
    
    -- Departamento y su Jefe
    dep.departamento_id,
    dep.codigo AS departamento_codigo,
    dep.nombre AS departamento_nombre,
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
    e.supervisor_directo_id,
    CONCAT(sup.nombres, ' ', sup.apellidos) AS supervisor_directo_nombre,
    sup.email AS supervisor_directo_email,

    -- Evaluador de Desempeño
    e.evaluador_id,
    CONCAT(ev.nombres, ' ', ev.apellidos) AS evaluador_especifico_nombre,
    ev.email AS evaluador_especifico_email,

    -- Evaluador Efectivo
    COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos)) AS evaluador_efectivo_nombre,
    COALESCE(ev.email, sup.email) AS evaluador_efectivo_email,
    CASE 
        WHEN e.evaluador_id IS NOT NULL AND e.evaluador_id <> e.supervisor_directo_id THEN 'EVALUADOR_ESPECIAL'
        ELSE 'SUPERVISOR_DIRECTO'
    END AS tipo_evaluador

FROM empleados e
INNER JOIN cargos c ON e.cargo_id = c.cargo_id
INNER JOIN departamentos dep ON e.departamento_id = dep.departamento_id
INNER JOIN gerencias g ON dep.gerencia_id = g.gerencia_id
INNER JOIN direcciones d ON g.direccion_id = d.direccion_id
INNER JOIN empresas emp ON d.empresa_id = emp.empresa_id
LEFT JOIN tabulador_empresas t ON e.tabulador_id = t.tabulador_id
LEFT JOIN empleados sup ON e.supervisor_directo_id = sup.empleado_id
LEFT JOIN empleados ev ON e.evaluador_id = ev.empleado_id
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
