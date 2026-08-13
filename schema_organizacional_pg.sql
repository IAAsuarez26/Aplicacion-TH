-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL: Estructura Organizacional, Empleados y Correlación de Responsables
-- Dialecto: PostgreSQL (PL/pgSQL)
-- ====================================================================================

-- ====================================================================================
-- 1. ELIMINACIÓN PREVIA DE OBJETOS (Ejecución limpia e idempotente con CASCADE)
-- ====================================================================================

DROP VIEW IF EXISTS vw_organigrama_completo CASCADE;
DROP VIEW IF EXISTS vw_resumen_responsables_area CASCADE;
DROP FUNCTION IF EXISTS sp_obtener_subordinados(INT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS historial_cargos_departamentos CASCADE;
DROP TABLE IF EXISTS empleados CASCADE;
DROP TABLE IF EXISTS departamentos CASCADE;
DROP TABLE IF EXISTS gerencias CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS cargos CASCADE;

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
-- 3. CREACIÓN DE TABLAS BASE
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
-- Tabla: direcciones (Nivel 1 de la Jerarquía Organizacional)
-- Ej. Dirección Ejecutiva, Dirección de Operaciones, Dirección de Tecnología
-- ------------------------------------------------------------------------------------
CREATE TABLE direcciones (
    direccion_id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    director_id INT NULL, -- Referencia al Empleado Responsable/Director (FK se agrega después)
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_direcciones_updated_at
BEFORE UPDATE ON direcciones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: gerencias (Nivel 2 de la Jerarquía Organizacional)
-- Ej. Gerencia de Sistemas, Gerencia de Recursos Humanos
-- ------------------------------------------------------------------------------------
CREATE TABLE gerencias (
    gerencia_id SERIAL PRIMARY KEY,
    direccion_id INT NOT NULL REFERENCES direcciones (direccion_id) ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    gerente_id INT NULL, -- Referencia al Empleado Responsable/Gerente (FK se agrega después)
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_gerencias_updated_at
BEFORE UPDATE ON gerencias
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: departamentos (Nivel 3 de la Jerarquía Organizacional)
-- Ej. Departamento de Desarrollo Backend, Depto. de Selección
-- ------------------------------------------------------------------------------------
CREATE TABLE departamentos (
    departamento_id SERIAL PRIMARY KEY,
    gerencia_id INT NOT NULL REFERENCES gerencias (gerencia_id) ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    jefe_departamento_id INT NULL, -- Referencia al Empleado Responsable/Jefe (FK se agrega después)
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_departamentos_updated_at
BEFORE UPDATE ON departamentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------------
-- Tabla: empleados (Ficha Maestra del Personal)
-- Almacena información personal, departamento, cargo, supervisor directo y evaluador
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
-- 4. DEFINICIÓN DE CLAVES FORÁNEAS DE RESPONSABLES POR ÁREA
-- ====================================================================================

ALTER TABLE direcciones ADD CONSTRAINT fk_direcciones_director
    FOREIGN KEY (director_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE gerencias ADD CONSTRAINT fk_gerencias_gerente
    FOREIGN KEY (gerente_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

ALTER TABLE departamentos ADD CONSTRAINT fk_departamentos_jefe
    FOREIGN KEY (jefe_departamento_id) REFERENCES empleados (empleado_id) ON DELETE SET NULL;

-- ====================================================================================
-- 5. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE JOINS Y BÚSQUEDAS)
-- ====================================================================================

CREATE INDEX idx_gerencias_direccion_id ON gerencias (direccion_id);
CREATE INDEX idx_departamentos_gerencia_id ON departamentos (gerencia_id);
CREATE INDEX idx_empleados_departamento_id ON empleados (departamento_id);
CREATE INDEX idx_empleados_cargo_id ON empleados (cargo_id);
CREATE INDEX idx_empleados_supervisor_directo_id ON empleados (supervisor_directo_id);
CREATE INDEX idx_empleados_evaluador_id ON empleados (evaluador_id) WHERE evaluador_id IS NOT NULL;

CREATE INDEX idx_direcciones_director_id ON direcciones (director_id) WHERE director_id IS NOT NULL;
CREATE INDEX idx_gerencias_gerente_id ON gerencias (gerente_id) WHERE gerente_id IS NOT NULL;
CREATE INDEX idx_departamentos_jefe_id ON departamentos (jefe_departamento_id) WHERE jefe_departamento_id IS NOT NULL;

-- ====================================================================================
-- 6. VISTAS DE CORRELACIÓN DE INFORMACIÓN ORGANIZACIONAL
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Vista 1: vw_organigrama_completo
-- Correlaciona cada empleado con toda su línea de mando (Dirección, Gerencia, Depto,
-- Supervisor directo, Evaluador asignado y los Directores/Gerentes/Jefes de área).
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
    
    -- Cargo
    c.cargo_id,
    c.nombre AS cargo_nombre,
    
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

    -- Evaluador Efectivo (Si no tiene evaluador específico asignado, por defecto es su supervisor directo)
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
LEFT JOIN empleados sup ON e.supervisor_directo_id = sup.empleado_id
LEFT JOIN empleados ev ON e.evaluador_id = ev.empleado_id
LEFT JOIN empleados jefe_dep ON dep.jefe_departamento_id = jefe_dep.empleado_id
LEFT JOIN empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN empleados dir ON d.director_id = dir.empleado_id;

-- ------------------------------------------------------------------------------------
-- Vista 2: vw_resumen_responsables_area
-- Inventario unificado de todas las Unidades Organizativas (Direcciones, Gerencias,
-- Departamentos), con su Responsable Líder asignado y cantidad de personal adscrito.
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_resumen_responsables_area AS
SELECT 
    'DIRECCIÓN' AS tipo_unidad,
    d.direccion_id AS unidad_id,
    d.codigo AS unidad_codigo,
    d.nombre AS unidad_nombre,
    d.director_id AS responsable_id,
    CONCAT(dir.nombres, ' ', dir.apellidos) AS responsable_nombre,
    dir.email AS responsable_email,
    c_dir.nombre AS responsable_cargo,
    (
        SELECT COUNT(e.empleado_id)
        FROM empleados e
        INNER JOIN departamentos dep ON e.departamento_id = dep.departamento_id
        INNER JOIN gerencias g ON dep.gerencia_id = g.gerencia_id
        WHERE g.direccion_id = d.direccion_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM direcciones d
LEFT JOIN empleados dir ON d.director_id = dir.empleado_id
LEFT JOIN cargos c_dir ON dir.cargo_id = c_dir.cargo_id

UNION ALL

SELECT 
    'GERENCIA' AS tipo_unidad,
    g.gerencia_id AS unidad_id,
    g.codigo AS unidad_codigo,
    g.nombre AS unidad_nombre,
    g.gerente_id AS responsable_id,
    CONCAT(ger.nombres, ' ', ger.apellidos) AS responsable_nombre,
    ger.email AS responsable_email,
    c_ger.nombre AS responsable_cargo,
    (
        SELECT COUNT(e.empleado_id)
        FROM empleados e
        INNER JOIN departamentos dep ON e.departamento_id = dep.departamento_id
        WHERE dep.gerencia_id = g.gerencia_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM gerencias g
LEFT JOIN empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN cargos c_ger ON ger.cargo_id = c_ger.cargo_id

UNION ALL

SELECT 
    'DEPARTAMENTO' AS tipo_unidad,
    dep.departamento_id AS unidad_id,
    dep.codigo AS unidad_codigo,
    dep.nombre AS unidad_nombre,
    dep.jefe_departamento_id AS responsable_id,
    CONCAT(jefe.nombres, ' ', jefe.apellidos) AS responsable_nombre,
    jefe.email AS responsable_email,
    c_jefe.nombre AS responsable_cargo,
    (
        SELECT COUNT(e.empleado_id)
        FROM empleados e
        WHERE e.departamento_id = dep.departamento_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM departamentos dep
LEFT JOIN empleados jefe ON dep.jefe_departamento_id = jefe.empleado_id
LEFT JOIN cargos c_jefe ON jefe.cargo_id = c_jefe.cargo_id;

-- ====================================================================================
-- 7. FUNCIÓN RECURSIVA PL/pgSQL: ÁRBOL DE SUBORDINADOS
-- Permite consultar todos los colaboradores directos e indirectos bajo la supervisión de un empleado.
-- ====================================================================================

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
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE organigrama_recursivo AS (
        -- Nivel 1: Subordinados Directos
        SELECT 
            e.empleado_id,
            e.codigo_empleado,
            e.nombres,
            e.apellidos,
            e.cargo_id,
            e.departamento_id,
            e.supervisor_directo_id,
            e.evaluador_id,
            1 AS nivel_jerarquico
        FROM empleados e
        WHERE e.supervisor_directo_id = p_supervisor_id AND e.estado_laboral = 'ACTIVO'

        UNION ALL

        -- Niveles N: Subordinados Indirectos (Recursión)
        SELECT 
            sub.empleado_id,
            sub.codigo_empleado,
            sub.nombres,
            sub.apellidos,
            sub.cargo_id,
            sub.departamento_id,
            sub.supervisor_directo_id,
            sub.evaluador_id,
            org.nivel_jerarquico + 1
        FROM empleados sub
        INNER JOIN organigrama_recursivo org ON sub.supervisor_directo_id = org.empleado_id
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
    INNER JOIN cargos c ON o.cargo_id = c.cargo_id
    INNER JOIN departamentos dep ON o.departamento_id = dep.departamento_id
    INNER JOIN gerencias g ON dep.gerencia_id = g.gerencia_id
    INNER JOIN direcciones d ON g.direccion_id = d.direccion_id
    LEFT JOIN empleados sup ON o.supervisor_directo_id = sup.empleado_id
    LEFT JOIN empleados ev ON o.evaluador_id = ev.empleado_id
    ORDER BY o.nivel_jerarquico, o.apellidos, o.nombres;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 8. DATOS DE PRUEBA Y VERIFICACIÓN (SEED DATA)
-- ====================================================================================

-- Insertar Cargos
INSERT INTO cargos (codigo, nombre, descripcion) VALUES
('CARG-001', 'Director General / VP', 'Máxima autoridad ejecutiva del área'),
('CARG-002', 'Gerente de Área', 'Responsable de la gestión estratégica de la gerencia'),
('CARG-003', 'Jefe de Departamento', 'Líder técnico y operativo del departamento'),
('CARG-004', 'Ingeniero de Software Senior', 'Desarrollador y diseñador de sistemas backend'),
('CARG-005', 'Analista de Talento Humano', 'Gestión de reclutamiento y personal');

-- Insertar Direcciones
INSERT INTO direcciones (codigo, nombre, descripcion) VALUES
('DIR-TECN', 'Dirección de Tecnología e Innovación', 'Dirección encargada de TI e infraestructura'),
('DIR-GHUM', 'Dirección de Gestión Humana', 'Dirección encargada del capital humano');

-- Insertar Gerencias
INSERT INTO gerencias (direccion_id, codigo, nombre, descripcion) VALUES
(1, 'GER-DESA', 'Gerencia de Desarrollo de Software', 'Desarrollo de aplicaciones y arquitectura'),
(2, 'GER-THUM', 'Gerencia de Desarrollo Organizacional', 'Gestión del talento y cultura');

-- Insertar Departamentos
INSERT INTO departamentos (gerencia_id, codigo, nombre, descripcion) VALUES
(1, 'DEP-BACK', 'Departamento Backend y Bases de Datos', 'Infraestructura de datos y APIs'),
(2, 'DEP-SELE', 'Departamento de Reclutamiento y Selección', 'Atracción de talento');

-- Insertar Empleados
-- Caso de prueba: EMP-0004 (María Fernández) tiene como supervisor a Luis Rodríguez (id: 3), 
-- pero su evaluador asignado es la Gerente Ana Gómez (id: 2).
INSERT INTO empleados (codigo_empleado, documento_identidad, nombres, apellidos, email, telefono, cargo_id, departamento_id, supervisor_directo_id, evaluador_id, fecha_ingreso) VALUES
('EMP-0001', 'V10000001', 'Carlos', 'Mendoza', 'carlos.mendoza@empresa.com', '+584141112233', 1, 1, NULL, NULL, '2020-01-15'),  -- Director TI
('EMP-0002', 'V10000002', 'Ana', 'Gómez', 'ana.gomez@empresa.com', '+584142223344', 2, 1, 1, NULL, '2021-03-01'),     -- Gerente Dev
('EMP-0003', 'V10000003', 'Luis', 'Rodríguez', 'luis.rodriguez@empresa.com', '+584143334455', 3, 1, 2, NULL, '2022-05-10'),  -- Jefe Backend
('EMP-0004', 'V10000004', 'María', 'Fernández', 'maria.fernandez@empresa.com', '+584144445566', 4, 1, 3, 2, '2023-08-20'),   -- Ing. Senior (Supervisor: Luis, Evaluador: Ana)
('EMP-0005', 'V10000005', 'Roberto', 'Pérez', 'roberto.perez@empresa.com', '+584145556677', 1, 2, NULL, NULL, '2019-11-01'); -- Director GH

-- Asignar Responsables a las Unidades Organizativas (Direcciones, Gerencias, Departamentos)
UPDATE direcciones SET director_id = 1 WHERE direccion_id = 1;
UPDATE direcciones SET director_id = 5 WHERE direccion_id = 2;

UPDATE gerencias SET gerente_id = 2 WHERE gerencia_id = 1;

UPDATE departamentos SET jefe_departamento_id = 3 WHERE departamento_id = 1;

-- ====================================================================================
-- 9. CONSULTAS DE PRUEBA Y VALIDACIÓN
-- ====================================================================================

-- Consulta 1: Vista del Organigrama Completo (Incluye Supervisor vs Evaluador)
SELECT 
    codigo_empleado,
    nombre_completo_empleado,
    cargo_nombre,
    departamento_nombre,
    supervisor_directo_nombre,
    evaluador_especifico_nombre,
    evaluador_efectivo_nombre,
    tipo_evaluador
FROM vw_organigrama_completo;

-- Consulta 2: Resumen de Responsables por Área y Total de Personal
SELECT * FROM vw_resumen_responsables_area;

-- Consulta 3: Probar Función PL/pgSQL de Subordinados para el Gerente (EMP-0002 / id: 2)
SELECT * FROM sp_obtener_subordinados(2);
