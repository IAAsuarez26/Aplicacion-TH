-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL: Estructura Organizacional, Tipos de Costos, Centros de Costos,
--             Empleados y Correlación de Responsables
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
IF OBJECT_ID(N'dbo.FK_empleados_tipo_costos', N'F') IS NOT NULL ALTER TABLE dbo.empleados DROP CONSTRAINT FK_empleados_tipo_costos;
IF OBJECT_ID(N'dbo.FK_departamentos_centros_costos', N'F') IS NOT NULL ALTER TABLE dbo.departamentos DROP CONSTRAINT FK_departamentos_centros_costos;
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
IF OBJECT_ID(N'dbo.CentrosCostos', N'U') IS NOT NULL DROP TABLE dbo.CentrosCostos;
IF OBJECT_ID(N'dbo.TipoCostos', N'U') IS NOT NULL DROP TABLE dbo.TipoCostos;
GO

-- ====================================================================================
-- 2. CREACIÓN DE TABLAS BASE Y COSTOS
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- Tabla: TipoCostos (MOD, MOI, Gastos)
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.TipoCostos (
    tipo_costo_id INT IDENTITY(1,1) NOT NULL,
    Codigo_TC VARCHAR(20) NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(250) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_TipoCostos_Activo DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_TipoCostos_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_TipoCostos_updated DEFAULT GETDATE(),
    CONSTRAINT PK_TipoCostos PRIMARY KEY CLUSTERED (tipo_costo_id),
    CONSTRAINT UQ_TipoCostos_Codigo UNIQUE (Codigo_TC)
);
GO

-- ------------------------------------------------------------------------------------
-- Tabla: CentrosCostos (Centros de Costo '01' a '15')
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.CentrosCostos (
    centro_costo_id INT IDENTITY(1,1) NOT NULL,
    Codigo_CC VARCHAR(20) NOT NULL,
    Descripcion NVARCHAR(150) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_CentrosCostos_Activo DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_CentrosCostos_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_CentrosCostos_updated DEFAULT GETDATE(),
    CONSTRAINT PK_CentrosCostos PRIMARY KEY CLUSTERED (centro_costo_id),
    CONSTRAINT UQ_CentrosCostos_Codigo UNIQUE (Codigo_CC)
);
GO

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
-- Tabla: gerencias (Nivel 2 con FK a Centros de Costos)
-- ------------------------------------------------------------------------------------
CREATE TABLE dbo.gerencias (
    gerencia_id INT IDENTITY(1,1) NOT NULL,
    direccion_id INT NOT NULL, -- Pertenencia a Dirección
    codigo_cc VARCHAR(20) NULL, -- FK a CentrosCostos
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
-- Tabla: empleados (Ficha Maestra con FK a TipoCostos)
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
    codigo_tc VARCHAR(20) NULL,     -- FK a TipoCostos
    di_supervisor VARCHAR(20) NULL, -- Referencia a Documento de Identidad del Jefe inmediato
    di_evaluador VARCHAR(20) NULL,  -- Referencia a Documento de Identidad cuando el evaluador difiere
    fecha_ingreso DATE NOT NULL,
    estado_laboral VARCHAR(20) NOT NULL CONSTRAINT DF_empleados_estado DEFAULT 'ACTIVO',
    created_at DATETIME2 NOT NULL CONSTRAINT DF_empleados_created DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_empleados_updated DEFAULT GETDATE(),
    CONSTRAINT PK_empleados PRIMARY KEY CLUSTERED (empleado_id),
    CONSTRAINT UQ_empleados_codigo UNIQUE (codigo_empleado),
    CONSTRAINT UQ_empleados_documento UNIQUE (documento_identidad),
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

ALTER TABLE dbo.gerencias ADD CONSTRAINT FK_gerencias_centros_costos
    FOREIGN KEY (codigo_cc) REFERENCES dbo.CentrosCostos (Codigo_CC)
    ON UPDATE CASCADE ON DELETE NO ACTION;

-- Adscripción del Empleado
ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_cargos
    FOREIGN KEY (cargo_id) REFERENCES dbo.cargos (cargo_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_departamentos
    FOREIGN KEY (departamento_id) REFERENCES dbo.departamentos (departamento_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_tipo_costos
    FOREIGN KEY (codigo_tc) REFERENCES dbo.TipoCostos (Codigo_TC)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_supervisor
    FOREIGN KEY (di_supervisor) REFERENCES dbo.empleados (documento_identidad)
    ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE dbo.empleados ADD CONSTRAINT FK_empleados_evaluador
    FOREIGN KEY (di_evaluador) REFERENCES dbo.empleados (documento_identidad)
    ON UPDATE CASCADE ON DELETE NO ACTION;

-- Historial de Cambios
ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_empleados
    FOREIGN KEY (empleado_id) REFERENCES dbo.empleados (empleado_id)
    ON DELETE CASCADE;

ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_cargos
    FOREIGN KEY (cargo_id) REFERENCES dbo.cargos (cargo_id)
    ON DELETE NO ACTION;

ALTER TABLE dbo.historial_cargos_departamentos ADD CONSTRAINT FK_historial_departamentos
    FOREIGN KEY (departamento_id) REFERENCES dbo.departamentos (departamento_id)
    ON DELETE NO ACTION;
GO

-- ====================================================================================
-- 4. ÍNDICES DE RENDIMIENTO (PERFORMANCE INDEXES)
-- ====================================================================================

CREATE NONCLUSTERED INDEX IX_TipoCostos_Codigo ON dbo.TipoCostos (Codigo_TC);
CREATE NONCLUSTERED INDEX IX_CentrosCostos_Codigo ON dbo.CentrosCostos (Codigo_CC);
CREATE NONCLUSTERED INDEX IX_gerencias_direccion_id ON dbo.gerencias (direccion_id);
CREATE NONCLUSTERED INDEX IX_gerencias_codigo_cc ON dbo.gerencias (codigo_cc);
CREATE NONCLUSTERED INDEX IX_departamentos_gerencia_id ON dbo.departamentos (gerencia_id);
CREATE NONCLUSTERED INDEX IX_empleados_departamento_id ON dbo.empleados (departamento_id);
CREATE NONCLUSTERED INDEX IX_empleados_cargo_id ON dbo.empleados (cargo_id);
CREATE NONCLUSTERED INDEX IX_empleados_codigo_tc ON dbo.empleados (codigo_tc);
CREATE NONCLUSTERED INDEX IX_empleados_di_supervisor ON dbo.empleados (di_supervisor);
CREATE NONCLUSTERED INDEX IX_empleados_di_evaluador ON dbo.empleados (di_evaluador) WHERE di_evaluador IS NOT NULL;
GO

-- ====================================================================================
-- 5. VISTAS DE CORRELACIÓN Y REPORTING
-- ====================================================================================

CREATE VIEW dbo.vw_organigrama_completo AS
SELECT 
    e.empleado_id,
    e.codigo_empleado,
    e.documento_identidad,
    CONCAT(e.nombres, ' ', e.apellidos) AS nombre_completo_empleado,
    e.email AS email_empleado,
    e.telefono AS telefono_empleado,
    e.estado_laboral,
    e.fecha_ingreso,
    c.cargo_id,
    c.codigo AS cargo_codigo,
    c.nombre AS cargo_nombre,
    dep.departamento_id,
    dep.codigo AS departamento_codigo,
    dep.nombre AS departamento_nombre,
    g.codigo_cc,
    cc.Descripcion AS centro_costo_descripcion,
    e.codigo_tc,
    tc.Nombre AS tipo_costo_nombre,
    tc.Descripcion AS tipo_costo_descripcion,
    dep.jefe_departamento_id,
    CONCAT(jefe_dep.nombres, ' ', jefe_dep.apellidos) AS jefe_departamento_nombre,
    g.gerencia_id,
    g.codigo AS gerencia_codigo,
    g.nombre AS gerencia_nombre,
    g.gerente_id,
    CONCAT(ger.nombres, ' ', ger.apellidos) AS gerente_area_nombre,
    d.direccion_id,
    d.codigo AS direccion_codigo,
    d.nombre AS direccion_nombre,
    d.director_id,
    CONCAT(dir.nombres, ' ', dir.apellidos) AS director_ejecutivo_nombre,
    e.di_supervisor,
    CONCAT(sup.nombres, ' ', sup.apellidos) AS supervisor_directo_nombre,
    sup.email AS supervisor_directo_email,
    e.di_evaluador,
    CONCAT(ev.nombres, ' ', ev.apellidos) AS evaluador_especifico_nombre,
    ev.email AS evaluador_especifico_email,
    COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos)) AS evaluador_efectivo_nombre,
    COALESCE(ev.email, sup.email) AS evaluador_efectivo_email,
    CASE 
        WHEN e.di_evaluador IS NOT NULL AND e.di_evaluador <> e.di_supervisor THEN 'EVALUADOR_ESPECIAL'
        ELSE 'SUPERVISOR_DIRECTO'
    END AS tipo_evaluador
FROM dbo.empleados e
INNER JOIN dbo.cargos c ON e.cargo_id = c.cargo_id
INNER JOIN dbo.departamentos dep ON e.departamento_id = dep.departamento_id
INNER JOIN dbo.gerencias g ON dep.gerencia_id = g.gerencia_id
LEFT JOIN dbo.CentrosCostos cc ON g.codigo_cc = cc.Codigo_CC
LEFT JOIN dbo.TipoCostos tc ON e.codigo_tc = tc.Codigo_TC
INNER JOIN dbo.direcciones d ON g.direccion_id = d.direccion_id
LEFT JOIN dbo.empleados sup ON e.di_supervisor = sup.documento_identidad
LEFT JOIN dbo.empleados ev ON e.di_evaluador = ev.documento_identidad
LEFT JOIN dbo.empleados jefe_dep ON dep.jefe_departamento_id = jefe_dep.empleado_id
LEFT JOIN dbo.empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN dbo.empleados dir ON d.director_id = dir.empleado_id;
GO
