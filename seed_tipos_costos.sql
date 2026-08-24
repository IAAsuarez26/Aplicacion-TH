-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL / DML: Tipos de Costos (MOD, MOI, Gastos)
-- Origen de Datos: TiposdeCostos.xlsx (Nómina Galac)
-- Dialecto: PostgreSQL (PL/pgSQL) - InsForge DB (TH_PB)
-- ====================================================================================

-- 1. CREACIÓN DE TABLA: tipo_costos
CREATE TABLE IF NOT EXISTS tipo_costos (
    tipo_costo_id SERIAL PRIMARY KEY,
    codigo_tc VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TRIGGER DE ACTUALIZACIÓN DE TIMESTAMP (updated_at)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tipo_costos_updated_at'
    ) THEN
        CREATE TRIGGER trg_tipo_costos_updated_at
        BEFORE UPDATE ON tipo_costos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_tipo_costos_codigo ON tipo_costos (codigo_tc);
CREATE INDEX IF NOT EXISTS idx_tipo_costos_activos ON tipo_costos (activo) WHERE activo = TRUE;

-- 4. INSERCIÓN DE DATOS (Seed)
INSERT INTO tipo_costos (codigo_tc, nombre, descripcion, activo)
VALUES
    ('01', 'MOD', 'Mano de Obra Directa', TRUE),
    ('02', 'MOI', 'Mano de Obra Indirecta', TRUE),
    ('03', 'Gastos', 'Gastos Operativos / Administrativos', TRUE)
ON CONFLICT (codigo_tc) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 5. VISTAS DE COMPATIBILIDAD
CREATE OR REPLACE VIEW tipos_costos AS
SELECT * FROM tipo_costos;

CREATE OR REPLACE VIEW "TipoCostos" AS
SELECT 
    tipo_costo_id,
    codigo_tc AS "Codigo_TC",
    nombre AS "Nombre",
    descripcion AS "Descripcion",
    activo AS "Activo",
    created_at,
    updated_at
FROM tipo_costos;
