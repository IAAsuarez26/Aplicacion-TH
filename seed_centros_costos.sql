-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL / DML: Centros de Costos
-- Origen de Datos: Centros de Costos.xlsx (Nómina Galac)
-- Dialecto: PostgreSQL (PL/pgSQL) - InsForge DB (TH_PB)
-- Total Registros: 15 ('01' al '15')
-- ====================================================================================

-- 1. CREACIÓN DE TABLA: centros_costos
CREATE TABLE IF NOT EXISTS centros_costos (
    centro_costo_id SERIAL PRIMARY KEY,
    codigo_cc VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TRIGGER DE ACTUALIZACIÓN DE TIMESTAMP (updated_at)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_centros_costos_updated_at'
    ) THEN
        CREATE TRIGGER trg_centros_costos_updated_at
        BEFORE UPDATE ON centros_costos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_centros_costos_codigo ON centros_costos (codigo_cc);
CREATE INDEX IF NOT EXISTS idx_centros_costos_activos ON centros_costos (activo) WHERE activo = TRUE;

-- 4. INSERCIÓN DE DATOS (Seed - 15 Centros de Costo con Codigo_CC de dos dígitos)
INSERT INTO centros_costos (codigo_cc, descripcion, activo)
VALUES
    ('01', 'Centro Costo #1', TRUE),
    ('02', 'Centro Costo #2', TRUE),
    ('03', 'Centro Costo #3', TRUE),
    ('04', 'Centro Costo #4', TRUE),
    ('05', 'Centro Costo #5', TRUE),
    ('06', 'Centro Costo #6', TRUE),
    ('07', 'Centro Costo #7', TRUE),
    ('08', 'Centro Costo #8', TRUE),
    ('09', 'Centro Costo #9', TRUE),
    ('10', 'Centro Costo #10', TRUE),
    ('11', 'Centro Costo #11', TRUE),
    ('12', 'Centro Costo #12', TRUE),
    ('13', 'Centro Costo #13', TRUE),
    ('14', 'Centro Costo #14', TRUE),
    ('15', 'Centro Costo #15', TRUE)
ON CONFLICT (codigo_cc) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = CURRENT_TIMESTAMP;

-- 5. VISTAS DE COMPATIBILIDAD
CREATE OR REPLACE VIEW centros_costo AS
SELECT * FROM centros_costos;

CREATE OR REPLACE VIEW "CentrosCostos" AS
SELECT 
    centro_costo_id,
    codigo_cc AS "Codigo_CC",
    descripcion AS "Descripcion",
    activo AS "Activo",
    created_at,
    updated_at
FROM centros_costos;
