-- ====================================================================================
-- Script: Eliminar columnas obsoletas supervisor_directo_id y evaluador_id
-- Base de Datos: TH_Replica (SQL Server / SRV2022-DWII)
-- Objetivo: Consolidar el uso exclusivo de di_supervisor y di_evaluador (Cédula/DI)
-- ====================================================================================

USE TH_Replica;
GO

SET NOCOUNT ON;
PRINT 'Iniciando proceso de depuración de columnas obsoletas en [dbo].[empleados]...';
GO

-- 1. Eliminar Llaves Foráneas (FK) asociadas a supervisor_directo_id o evaluador_id si existen
DECLARE @sqlDropFk NVARCHAR(MAX) = N'';

SELECT @sqlDropFk += N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) 
                   + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(13)
FROM sys.foreign_keys fk
INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
WHERE t.name = 'empleados' AND c.name IN ('supervisor_directo_id', 'evaluador_id');

IF LEN(@sqlDropFk) > 0
BEGIN
    PRINT 'Eliminando restricciones Foreign Key asociadas...';
    EXEC sp_executesql @sqlDropFk;
END
ELSE
BEGIN
    PRINT 'No se encontraron restricciones Foreign Key asociadas a estas columnas.';
END
GO

-- 2. Eliminar Índices asociados a supervisor_directo_id o evaluador_id si existen
DECLARE @sqlDropIdx NVARCHAR(MAX) = N'';

SELECT @sqlDropIdx += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';' + CHAR(13)
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE t.name = 'empleados' AND c.name IN ('supervisor_directo_id', 'evaluador_id') AND i.is_primary_key = 0;

IF LEN(@sqlDropIdx) > 0
BEGIN
    PRINT 'Eliminando índices asociados a las columnas...';
    EXEC sp_executesql @sqlDropIdx;
END
ELSE
BEGIN
    PRINT 'No se encontraron índices asociados a estas columnas.';
END
GO

-- 3. Eliminar restricciones DEFAULT asociadas si existen
DECLARE @sqlDropDf NVARCHAR(MAX) = N'';

SELECT @sqlDropDf += N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) 
                   + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';' + CHAR(13)
FROM sys.default_constraints dc
INNER JOIN sys.tables t ON dc.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE t.name = 'empleados' AND c.name IN ('supervisor_directo_id', 'evaluador_id');

IF LEN(@sqlDropDf) > 0
BEGIN
    PRINT 'Eliminando restricciones Default asociadas...';
    EXEC sp_executesql @sqlDropDf;
END
GO

-- 4. Eliminar las columnas supervisor_directo_id y evaluador_id de [dbo].[empleados]
IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.empleados') 
    AND name = 'supervisor_directo_id'
)
BEGIN
    PRINT 'Eliminando columna supervisor_directo_id de dbo.empleados...';
    ALTER TABLE dbo.empleados DROP COLUMN supervisor_directo_id;
END
ELSE
BEGIN
    PRINT 'La columna supervisor_directo_id ya no existe en dbo.empleados.';
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.empleados') 
    AND name = 'evaluador_id'
)
BEGIN
    PRINT 'Eliminando columna evaluador_id de dbo.empleados...';
    ALTER TABLE dbo.empleados DROP COLUMN evaluador_id;
END
ELSE
BEGIN
    PRINT 'La columna evaluador_id ya no existe en dbo.empleados.';
END
GO

-- 5. Verificación Final de la estructura de [dbo].[empleados]
PRINT '----------------------------------------------------------------------';
PRINT 'Estructura actual de campos de supervisión en dbo.empleados:';
PRINT '----------------------------------------------------------------------';
SELECT 
    c.name AS Columna,
    t.name AS TipoDato,
    c.max_length AS Longitud,
    c.is_nullable AS PermiteNulos
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.empleados')
  AND c.name IN ('di_supervisor', 'di_evaluador', 'supervisor_directo_id', 'evaluador_id')
ORDER BY c.column_id;
GO

PRINT 'Depuración completada exitosamente.';
GO
