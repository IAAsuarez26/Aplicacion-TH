-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL: Estructura Organizacional, Empleados y Correlación de Responsables
-- Dialecto: Microsoft SQL Server (T-SQL)
-- ====================================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'DB_TalentoHumano')
BEGIN
    CREATE DATABASE DB_TalentoHumano;
END;
GO

USE DB_TalentoHumano;
GO

-- ====================================================================================
-- 1. ELIMINACIÓN PREVIA DE OBJETOS (Para ejecución idempotente limpia)
-- ====================================================================================

-- Eliminar Vistas si existen
IF OBJECT_ID(N'dbo.vw_organigrama_completo', N'V') IS NOT NULL DROP VIEW dbo.vw_organigrama_completo;
IF OBJECT_ID(N'dbo.vw_resumen_responsables_area', N'V') IS NOT NULL DROP VIEW dbo.vw_resumen_responsables_area;
GO

-- Eliminar Stored Procedures / CTEs
IF OBJECT_ID(N'dbo.sp_obtener_subordinados', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_obtener_subordinados;
GO

-- Eliminar Claves Foráneas para evitar dependencias circulares al drop
IF OBJECT_ID(N'dbo.FK_direcciones_director', N'F') IS NOT NULL ALTER TABLE dbo.direcciones DROP CONSTRAINT FK_direcciones_director;
IF OBJECT_ID(N'dbo.FK_gerencias_gerente', N'F') IS NOT NULL ALTER TABLE dbo.gerencias DROP CONSTRAINT FK_gerencias_gerente;
IF OBJECT_ID(N'dbo.FK_departamentos_jefe', N'F') IS NOT NULL ALTER TABLE dbo.departamentos DROP CONSTRAINT FK_departamentos_jefe;
IF OBJECT_ID(N'dbo.FK_empleados_evaluador', N'F') IS NOT NULL ALTER TABLE dbo.empleados DROP CONSTRAINT FK_empleados_evaluador;
IF OBJECT_ID(N'dbo.FK_empleados_supervisor', N'F') IS NOT NULL ALTER TABLE dbo.empleados DROP CONSTRAINT FK_empleados_supervisor;
IF OBJECT_ID(N'dbo.FK_empleados_departamentos', N'F') IS NOT NULL ALTER TABLE dbo.empleados DROP CONSTRAINT FK_empleados_departamentos;
IF OBJECT_ID(N'dbo.FK_empleados_cargos', N'F') IS NOT NULL ALTER TABLE dbo.empleados DROP CONSTRAINT FK_empleados_cargos;
IF OBJECT_ID(N'dbo.FK_departamentos_gerencias', N'F') IS NOT NULL ALTER TABLE dbo.departamentos DROP CONSTRAINT FK_departamentos_gerencias;
IF OBJECT_ID(N'dbo.FK_gerencias_direcciones', N'F') IS NOT NULL ALTER TABLE dbo.gerencias DROP CONSTRAINT FK_gerencias_direcciones;
IF OBJECT_ID(N'dbo.FK_historial_empleados', N'F') IS NOT NULL ALTER TABLE dbo.historial_cargos_departamentos DROP CONSTRAINT FK_historial_empleados;
IF OBJECT_ID(N'dbo.FK_historial_cargos', N'F') IS NOT NULL ALTER TABLE dbo.historial_cargos_departamentos DROP CONSTRAINT FK_historial_cargos;
IF OBJECT_ID(N'dbo.FK_historial_departamentos', N'F') IS NOT NULL ALTER TABLE dbo.historial_cargos_departamentos DROP CONSTRAINT FK_historial_departamentos;
GO

-- Eliminar Tablas si existen
IF OBJECT_ID(N'dbo.historial_cargos_departamentos', N'U') IS NOT NULL DROP TABLE dbo.historial_cargos_departamentos;
IF OBJECT_ID(N'dbo.empleados', N'U') IS NOT NULL DROP TABLE dbo.empleados;
IF OBJECT_ID(N'dbo.departamentos', N'U') IS NOT NULL DROP TABLE dbo.departamentos;
IF OBJECT_ID(N'dbo.gerencias', N'U') IS NOT NULL DROP TABLE dbo.gerencias;
IF OBJECT_ID(N'dbo.direcciones', N'U') IS NOT NULL DROP TABLE dbo.direcciones;
IF OBJECT_ID(N'dbo.cargos', N'U') IS NOT NULL DROP TABLE dbo.cargos;
GO

-- ====================================================================================
-- 2. CREACIÓN DE TABLAS BASE
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Tabla: cargos (Catálogo de Puestos/Títulos de la Organización)
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.cargos (
    cargo_id INT IDENTITY(1,1) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    estado BIT NOT NULL CONSTRAINT DF_cargos_estado DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_cargos_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_cargos_updated DEFAULT GETDATE(),
    CONSTRAINT PK_cargos PRIMARY KEY CLUSTERED (cargo_id),
    CONSTRAINT UQ_cargos_codigo UNIQUE (codigo)
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: direcciones (Nivel 1 de la Jerarquía Organizacional)
-- Ej. Dirección Ejecutiva, Dirección de Operaciones, Dirección de Tecnología
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.direcciones (
    direccion_id INT IDENTITY(1,1) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    director_id INT NULL, -- Referencia al Empleado Responsable/Director
    estado BIT NOT NULL CONSTRAINT DF_direcciones_estado DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_direcciones_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_direcciones_updated DEFAULT GETDATE(),
    CONSTRAINT PK_direcciones PRIMARY KEY CLUSTERED (direccion_id),
    CONSTRAINT UQ_direcciones_codigo UNIQUE (codigo)
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: gerencias (Nivel 2 de la Jerarquía Organizacional)
-- Ej. Gerencia de Sistemas, Gerencia de Recursos Humanos
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.gerencias (
    gerencia_id INT IDENTITY(1,1) NOT NULL,
    direccion_id INT NOT NULL, -- Pertenencia a Dirección
    codigo VARCHAR(20) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    gerente_id INT NULL, -- Referencia al Empleado Responsable/Gerente
    estado BIT NOT NULL CONSTRAINT DF_gerencias_estado DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_gerencias_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_gerencias_updated DEFAULT GETDATE(),
    CONSTRAINT PK_gerencias PRIMARY KEY CLUSTERED (gerencia_id),
    CONSTRAINT UQ_gerencias_codigo UNIQUE (codigo)
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: departamentos (Nivel 3 de la Jerarquía Organizacional)
-- Ej. Departamento de Desarrollo Backend, Depto. de Selección
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.departamentos (
    departamento_id INT IDENTITY(1,1) NOT NULL,
    gerencia_id INT NOT NULL, -- Pertenencia a Gerencia
    codigo VARCHAR(20) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    jefe_departamento_id INT NULL, -- Referencia al Empleado Responsable/Jefe
    estado BIT NOT NULL CONSTRAINT DF_departamentos_estado DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_departamentos_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_departamentos_updated DEFAULT GETDATE(),
    CONSTRAINT PK_departamentos PRIMARY KEY CLUSTERED (departamento_id),
    CONSTRAINT UQ_departamentos_codigo UNIQUE (codigo)
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: empleados (Ficha Maestra del Personal)
-- Almacena información personal, departamento, cargo, supervisor directo y evaluador
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.empleados (
    empleado_id INT IDENTITY(1,1) NOT NULL,
    codigo_empleado VARCHAR(20) NOT NULL,
    documento_identidad VARCHAR(20) NULL,
    nombres NVARCHAR(100) NOT NULL,
    apellidos NVARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NULL,
    cargo_id INT NOT NULL,
    departamento_id INT NOT NULL,
    supervisor_directo_id INT NULL, -- Auto-referencia a otro empleado (Jefe inmediato)
    evaluador_id INT NULL,          -- Auto-referencia a otro empleado cuando el evaluador difiere del supervisor directo
    fecha_ingreso DATE NOT NULL,
    estado_laboral VARCHAR(20) NOT NULL CONSTRAINT DF_empleados_estado DEFAULT 'ACTIVO',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_empleados_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_empleados_updated DEFAULT GETDATE(),
    CONSTRAINT PK_empleados PRIMARY KEY CLUSTERED (empleado_id),
    CONSTRAINT UQ_empleados_codigo UNIQUE (codigo_empleado),
    CONSTRAINT UQ_empleados_email UNIQUE (email),
    CONSTRAINT CK_empleados_estado CHECK (estado_laboral IN ('ACTIVO', 'INACTIVO', 'VACACIONES', 'LICENCIA'))
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: historial_cargos_departamentos (Control Histórico de Traslados y Ascensos)
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.historial_cargos_departamentos (
    historial_id INT IDENTITY(1,1) NOT NULL,
    empleado_id INT NOT NULL,
    cargo_id INT NOT NULL,
    departamento_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    motivo_cambio NVARCHAR(250) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_historial_created DEFAULT GETDATE(),
    CONSTRAINT PK_historial_cargos_departamentos PRIMARY KEY CLUSTERED (historial_id)
);
GO

-- ====================================================================================
-- 3. DEFINICIÓN DE CLAVES FORÁNEAS (FOREIGN KEYS)
-- ====================================================================================

-- Jerarquía de Estructura Organizativa
ALTER TABLE dbo.gerencias ADD CONSTRAINT FK_gerencias_direcciones
    FOREIGN KEY (direccion_id) REFERENCES dbo.direcciones (direccion_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.departamentos ADD CONSTRAINT FK_departamentos_gerencias
    FOREIGN KEY (gerencia_id) REFERENCES dbo.gerencias (gerencia_id)
    ON DELETE NO ACTION;

-- Adscripción del Empleado
ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_cargos
    FOREIGN KEY (cargo_id) REFERENCES dbo.cargos (cargo_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_departamentos
    FOREIGN KEY (departamento_id) REFERENCES dbo.departamentos (departamento_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_supervisor
    FOREIGN KEY (supervisor_directo_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_evaluador
    FOREIGN KEY (evaluador_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE NO ACTION;

-- Asignación de Responsables por Área (Evita dependencias circulares estrictas usando SET NULL)
ALTER TABLE dbo.direcciones ADD CONSTRAINT FK_direcciones_director
    FOREIGN KEY (director_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE SET NULL;

ALTER TABLE dbo.gerencias ADD CONSTRAINT FK_gerencias_gerente
    FOREIGN KEY (gerente_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE SET NULL;

ALTER TABLE dbo.departamentos ADD CONSTRAINT FK_departamentos_jefe
    FOREIGN KEY (jefe_departamento_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE SET NULL;

-- Relaciones de Historial
ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_empleados
    FOREIGN KEY (empleado_id) REFERENCES dbo.empleados (empleado_id) ON DELETE CASCADE;

ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_cargos
    FOREIGN KEY (cargo_id) REFERENCES dbo.cargos (cargo_id) ON DELETE NO ACTION;

ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_departamentos
    FOREIGN KEY (departamento_id) REFERENCES dbo.departamentos (departamento_id) ON DELETE NO ACTION;
GO

-- ====================================================================================
-- 4. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE JOINS Y BÚSQUEDAS)
-- ====================================================================================

CREATE NONCLUSTERED INDEX IX_gerencias_direccion_id ON dbo.gerencias (direccion_id);
CREATE NONCLUSTERED INDEX IX_departamentos_gerencia_id ON dbo.departamentos (gerencia_id);
CREATE NONCLUSTERED INDEX IX_empleados_departamento_id ON dbo.empleados (departamento_id);
CREATE NONCLUSTERED INDEX IX_empleados_cargo_id ON dbo.empleados (cargo_id);
CREATE NONCLUSTERED INDEX IX_empleados_supervisor_directo_id ON dbo.empleados (supervisor_directo_id);
CREATE NONCLUSTERED INDEX IX_empleados_evaluador_id ON dbo.empleados (evaluador_id) WHERE evaluador_id IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_direcciones_director_id ON dbo.direcciones (director_id) WHERE director_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_gerencias_gerente_id ON dbo.gerencias (gerente_id) WHERE gerente_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_departamentos_jefe_id ON dbo.departamentos (jefe_departamento_id) WHERE jefe_departamento_id IS NOT NULL;
GO

-- ====================================================================================
-- 5. VISTAS DE CORRELACIÓN DE INFORMACIÓN ORGANIZACIONAL
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Vista 1: vw_organigrama_completo
-- Correlaciona cada empleado con toda su línea de mando (Dirección, Gerencia, Depto,
-- Supervisor directo, Evaluador asignado y los Directores/Gerentes/Jefes de área).
-- ------------------------------------------------------------------------------------
CREATE VIEW dbo.vw_organigrama_completo
AS
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

FROM dbo.empleados e
INNER JOIN dbo.cargos c ON e.cargo_id = c.cargo_id
INNER JOIN dbo.departamentos dep ON e.departamento_id = dep.departamento_id
INNER JOIN dbo.gerencias g ON dep.gerencia_id = g.gerencia_id
INNER JOIN dbo.direcciones d ON g.direccion_id = d.direccion_id
LEFT JOIN dbo.empleados sup ON e.supervisor_directo_id = sup.empleado_id
LEFT JOIN dbo.empleados ev ON e.evaluador_id = ev.empleado_id
LEFT JOIN dbo.empleados jefe_dep ON dep.jefe_departamento_id = jefe_dep.empleado_id
LEFT JOIN dbo.empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN dbo.empleados dir ON d.director_id = dir.empleado_id;
GO

-- ------------------------------------------------------------------------------------
-- Vista 2: vw_resumen_responsables_area
-- Inventario unificado de todas las Unidades Organizativas (Direcciones, Gerencias,
-- Departamentos), con su Responsable Líder asignado y cantidad de personal adscrito.
-- ------------------------------------------------------------------------------------
CREATE VIEW dbo.vw_resumen_responsables_area
AS
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
        FROM dbo.empleados e
        INNER JOIN dbo.departamentos dep ON e.departamento_id = dep.departamento_id
        INNER JOIN dbo.gerencias g ON dep.gerencia_id = g.gerencia_id
        WHERE g.direccion_id = d.direccion_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM dbo.direcciones d
LEFT JOIN dbo.empleados dir ON d.director_id = dir.empleado_id
LEFT JOIN dbo.cargos c_dir ON dir.cargo_id = c_dir.cargo_id

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
        FROM dbo.empleados e
        INNER JOIN dbo.departamentos dep ON e.departamento_id = dep.departamento_id
        WHERE dep.gerencia_id = g.gerencia_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM dbo.gerencias g
LEFT JOIN dbo.empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN dbo.cargos c_ger ON ger.cargo_id = c_ger.cargo_id

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
        FROM dbo.empleados e
        WHERE e.departamento_id = dep.departamento_id AND e.estado_laboral = 'ACTIVO'
    ) AS total_empleados_activos
FROM dbo.departamentos dep
LEFT JOIN dbo.empleados jefe ON dep.jefe_departamento_id = jefe.empleado_id
LEFT JOIN dbo.cargos c_jefe ON jefe.cargo_id = c_jefe.cargo_id;
GO

-- ====================================================================================
-- 6. PROCEDIMIENTO ALMACENADO: ÁRBOL DE SUBORDINADOS RECURSIVO
-- Permite consultar todos los colaboradores directos e indirectos bajo la supervisión de un empleado.
-- ====================================================================================
CREATE PROCEDURE dbo.sp_obtener_subordinados
    @p_supervisor_id INT
AS
BEGIN
    SET NOCOUNT ON;

    WITH OrganigramaRecursivo AS (
        -- Nivel 1: Subordinados Directos
        SELECT 
            empleado_id,
            codigo_empleado,
            nombres,
            apellidos,
            cargo_id,
            departamento_id,
            supervisor_directo_id,
            evaluador_id,
            1 AS nivel_jerarquico
        FROM dbo.empleados
        WHERE supervisor_directo_id = @p_supervisor_id AND estado_laboral = 'ACTIVO'

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
        FROM dbo.empleados sub
        INNER JOIN OrganigramaRecursivo org ON sub.supervisor_directo_id = org.empleado_id
        WHERE sub.estado_laboral = 'ACTIVO'
    )
    SELECT 
        o.nivel_jerarquico,
        o.empleado_id,
        o.codigo_empleado,
        CONCAT(o.nombres, ' ', o.apellidos) AS nombre_completo,
        c.nombre AS cargo,
        dep.nombre AS departamento,
        g.nombre AS gerencia,
        d.nombre AS direccion,
        CONCAT(sup.nombres, ' ', sup.apellidos) AS supervisor_inmediato,
        COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos)) AS evaluador_efectivo
    FROM OrganigramaRecursivo o
    INNER JOIN dbo.cargos c ON o.cargo_id = c.cargo_id
    INNER JOIN dbo.departamentos dep ON o.departamento_id = dep.departamento_id
    INNER JOIN dbo.gerencias g ON dep.gerencia_id = g.gerencia_id
    INNER JOIN dbo.direcciones d ON g.direccion_id = d.direccion_id
    LEFT JOIN dbo.empleados sup ON o.supervisor_directo_id = sup.empleado_id
    LEFT JOIN dbo.empleados ev ON o.evaluador_id = ev.empleado_id
    ORDER BY o.nivel_jerarquico, o.apellidos, o.nombres;
END;
GO

-- ====================================================================================
-- 7. DATOS DE PRUEBA Y VERIFICACIÓN (SEED DATA)
-- ====================================================================================

-- Insertar Cargos
INSERT INTO dbo.cargos (codigo, nombre, descripcion) VALUES
('CARG-001', 'Director General / VP', 'Máxima autoridad ejecutiva del área'),
('CARG-002', 'Gerente de Área', 'Responsable de la gestión estratégica de la gerencia'),
('CARG-003', 'Jefe de Departamento', 'Líder técnico y operativo del departamento'),
('CARG-004', 'Ingeniero de Software Senior', 'Desarrollador y diseñador de sistemas backend'),
('CARG-005', 'Analista de Talento Humano', 'Gestión de reclutamiento y personal');

-- Insertar Direcciones
INSERT INTO dbo.direcciones (codigo, nombre, descripcion) VALUES
('DIR-TECN', 'Dirección de Tecnología e Innovación', 'Dirección encargada de TI e infraestructura'),
('DIR-GHUM', 'Dirección de Gestión Humana', 'Dirección encargada del capital humano');

-- Insertar Gerencias
INSERT INTO dbo.gerencias (direccion_id, codigo, nombre, descripcion) VALUES
(1, 'GER-DESA', 'Gerencia de Desarrollo de Software', 'Desarrollo de aplicaciones y arquitectura'),
(2, 'GER-THUM', 'Gerencia de Desarrollo Organizacional', 'Gestión del talento y cultura');

-- Insertar Departamentos
INSERT INTO dbo.departamentos (gerencia_id, codigo, nombre, descripcion) VALUES
(1, 'DEP-BACK', 'Departamento Backend y Bases de Datos', 'Infraestructura de datos y APIs'),
(2, 'DEP-SELE', 'Departamento de Reclutamiento y Selección', 'Atracción de talento');

-- Insertar Empleados
-- Caso de prueba: EMP-0004 (María Fernández) tiene como supervisor a Luis Rodríguez (id: 3), 
-- pero su evaluador asignado es la Gerente Ana Gómez (id: 2).
INSERT INTO dbo.empleados (codigo_empleado, documento_identidad, nombres, apellidos, email, telefono, cargo_id, departamento_id, supervisor_directo_id, evaluador_id, fecha_ingreso) VALUES
('EMP-0001', 'V10000001', 'Carlos', 'Mendoza', 'carlos.mendoza@empresa.com', '+584141112233', 1, 1, NULL, NULL, '2020-01-15'),  -- Director TI
('EMP-0002', 'V10000002', 'Ana', 'Gómez', 'ana.gomez@empresa.com', '+584142223344', 2, 1, 1, NULL, '2021-03-01'),     -- Gerente Dev
('EMP-0003', 'V10000003', 'Luis', 'Rodríguez', 'luis.rodriguez@empresa.com', '+584143334455', 3, 1, 2, NULL, '2022-05-10'),  -- Jefe Backend
('EMP-0004', 'V10000004', 'María', 'Fernández', 'maria.fernandez@empresa.com', '+584144445566', 4, 1, 3, 2, '2023-08-20'),   -- Ing. Senior (Supervisor: Luis, Evaluador: Ana)
('EMP-0005', 'V10000005', 'Roberto', 'Pérez', 'roberto.perez@empresa.com', '+584145556677', 1, 2, NULL, NULL, '2019-11-01'); -- Director GH

-- Asignar Responsables a las Unidades Organizativas (Direcciones, Gerencias, Departamentos)
UPDATE dbo.direcciones SET director_id = 1 WHERE direccion_id = 1;
UPDATE dbo.direcciones SET director_id = 5 WHERE direccion_id = 2;

UPDATE dbo.gerencias SET gerente_id = 2 WHERE gerencia_id = 1;

UPDATE dbo.departamentos SET jefe_departamento_id = 3 WHERE departamento_id = 1;
GO

-- ====================================================================================
-- 8. CONSULTAS DE PRUEBA Y VALIDACIÓN
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
FROM dbo.vw_organigrama_completo;

-- Consulta 2: Resumen de Responsables por Área y Total de Personal
SELECT * FROM dbo.vw_resumen_responsables_area;

-- Consulta 3: Probar Stored Procedure de Subordinados para el Gerente (EMP-0002 / id: 2)
EXEC dbo.sp_obtener_subordinados @p_supervisor_id = 2;
GO
