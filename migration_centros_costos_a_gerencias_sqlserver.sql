-- ====================================================================================
-- MIGRACIÓN DDL / DML: Reubicación de Centros de Costos a Gerencias (Nivel 2)
-- Base de Datos: SQL Server - Esquema dbo
-- Objetivo: La tabla CentrosCostos ahora se vincula con gerencias (no con departamentos).
-- ====================================================================================

-- 1. AÑADIR COLUMNA codigo_cc A dbo.gerencias
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.gerencias') AND name = 'codigo_cc'
)
BEGIN
    ALTER TABLE dbo.gerencias ADD codigo_cc VARCHAR(20) NULL;
END
GO

-- 2. CREAR CLAVE FORÁNEA FK_gerencias_centros_costos
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE object_id = OBJECT_ID(N'dbo.FK_gerencias_centros_costos')
)
BEGIN
    ALTER TABLE dbo.gerencias ADD CONSTRAINT FK_gerencias_centros_costos
        FOREIGN KEY (codigo_cc) REFERENCES dbo.CentrosCostos (Codigo_CC)
        ON UPDATE CASCADE ON DELETE NO ACTION;
END
GO

-- 3. CREAR ÍNDICE PARA RENDIMIENTO
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID(N'dbo.gerencias') AND name = 'IX_gerencias_codigo_cc'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_gerencias_codigo_cc ON dbo.gerencias (codigo_cc);
END
GO

-- 4. TRASPASO / MIGRACIÓN DE DATOS EXISTENTES
-- Mueve los centros de costo asignados previamente en departamentos a sus respectivas gerencias padre
UPDATE g
SET g.codigo_cc = dep.codigo_cc,
    g.updated_at = GETDATE()
FROM dbo.gerencias g
INNER JOIN dbo.departamentos dep ON dep.gerencia_id = g.gerencia_id
WHERE dep.codigo_cc IS NOT NULL
  AND (g.codigo_cc IS NULL OR g.codigo_cc = '');
GO

-- 5. RECREAR VISTA dbo.vw_organigrama_completo
IF OBJECT_ID(N'dbo.vw_organigrama_completo', N'V') IS NOT NULL
    DROP VIEW dbo.vw_organigrama_completo;
GO

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
    g.codigo_cc AS gerencia_codigo_cc,
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

-- 6. DESVINCULAR CENTRO DE COSTOS DE LA TABLA dbo.departamentos
IF OBJECT_ID(N'dbo.FK_departamentos_centros_costos', N'F') IS NOT NULL
    ALTER TABLE dbo.departamentos DROP CONSTRAINT FK_departamentos_centros_costos;
GO

IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID(N'dbo.departamentos') AND name = 'IX_departamentos_codigo_cc'
)
    DROP INDEX IX_departamentos_codigo_cc ON dbo.departamentos;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.departamentos') AND name = 'codigo_cc'
)
    ALTER TABLE dbo.departamentos DROP COLUMN codigo_cc;
GO
