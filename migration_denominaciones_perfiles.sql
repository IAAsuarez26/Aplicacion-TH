-- ====================================================================================
-- MIGRACIÓN DDL Y DML: Incorporación de Denominaciones_Cargos y Perfiles_Competencias
-- Relaciones FK: Cargos (Codigo_DC) y Empleados (Codigo_PC)
-- Dialecto: PostgreSQL (InsForge DB: TH_PB)
-- ====================================================================================

-- 1. TABLA: denominaciones_cargos (Catálogo Maestro de Denominaciones)
CREATE TABLE IF NOT EXISTS denominaciones_cargos (
    denominacion_cargo_id SERIAL PRIMARY KEY,
    codigo_dc VARCHAR(20) NOT NULL UNIQUE,
    denominacion VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER trg_denominaciones_cargos_updated_at
BEFORE UPDATE ON denominaciones_cargos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_denominaciones_cargos_codigo_dc ON denominaciones_cargos (codigo_dc);
CREATE INDEX IF NOT EXISTS idx_denominaciones_cargos_activos ON denominaciones_cargos (activo) WHERE activo = TRUE;

CREATE OR REPLACE VIEW "Denominaciones_Cargos" AS SELECT * FROM denominaciones_cargos;

-- 2. TABLA: perfiles_competencias (Catálogo Maestro de Perfiles de Competencia)
CREATE TABLE IF NOT EXISTS perfiles_competencias (
    perfil_competencia_id SERIAL PRIMARY KEY,
    codigo_pc VARCHAR(20) NOT NULL UNIQUE,
    perfil VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER trg_perfiles_competencias_updated_at
BEFORE UPDATE ON perfiles_competencias
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_perfiles_competencias_codigo_pc ON perfiles_competencias (codigo_pc);
CREATE INDEX IF NOT EXISTS idx_perfiles_competencias_activos ON perfiles_competencias (activo) WHERE activo = TRUE;

CREATE OR REPLACE VIEW "Perfiles_Competencias" AS SELECT * FROM perfiles_competencias;

-- 3. PERMISOS
GRANT ALL PRIVILEGES ON TABLE denominaciones_cargos TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE perfiles_competencias TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE "Denominaciones_Cargos" TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE "Perfiles_Competencias" TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. POBLACIÓN DE DATOS (Origen: Excel en documentos/)
INSERT INTO denominaciones_cargos (codigo_dc, denominacion, activo)
VALUES
    ('DC-0001', 'Analista', TRUE),
    ('DC-0002', 'Aprendiz', TRUE),
    ('DC-0003', 'Asesor', TRUE),
    ('DC-0004', 'Asistente', TRUE),
    ('DC-0005', 'Coordinador', TRUE),
    ('DC-0006', 'Directivo', TRUE),
    ('DC-0007', 'Director', TRUE),
    ('DC-0008', 'Ejecutivo', TRUE),
    ('DC-0009', 'Especialista', TRUE),
    ('DC-0010', 'Gerente', TRUE),
    ('DC-0011', 'Gerente Jr', TRUE),
    ('DC-0012', 'Gerente Sr.', TRUE),
    ('DC-0013', 'Lider Ventas', TRUE),
    ('DC-0014', 'Operario', TRUE),
    ('DC-0015', 'Pasante', TRUE),
    ('DC-0016', 'Supervisor', TRUE),
    ('DC-0017', 'Trainee', TRUE)
ON CONFLICT (codigo_dc) DO UPDATE SET
    denominacion = EXCLUDED.denominacion,
    activo = EXCLUDED.activo;

INSERT INTO perfiles_competencias (codigo_pc, perfil, activo)
VALUES
    ('PC-0001', 'Administrativo', TRUE),
    ('PC-0002', 'Líder', TRUE),
    ('PC-0003', 'Operativo', TRUE)
ON CONFLICT (codigo_pc) DO UPDATE SET
    perfil = EXCLUDED.perfil,
    activo = EXCLUDED.activo;

-- 5. RELACIÓN FK: CARGOS -> DENOMINACIONES_CARGOS (Codigo_DC)
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS codigo_dc VARCHAR(20) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_cargos_denominacion'
    ) THEN
        ALTER TABLE cargos ADD CONSTRAINT fk_cargos_denominacion
        FOREIGN KEY (codigo_dc) REFERENCES denominaciones_cargos (codigo_dc)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cargos_codigo_dc ON cargos (codigo_dc);

-- 6. RELACIÓN FK: EMPLEADOS -> PERFILES_COMPETENCIAS (Codigo_PC)
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS codigo_pc VARCHAR(20) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_empleados_perfil_competencia'
    ) THEN
        ALTER TABLE empleados ADD CONSTRAINT fk_empleados_perfil_competencia
        FOREIGN KEY (codigo_pc) REFERENCES perfiles_competencias (codigo_pc)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_empleados_codigo_pc ON empleados (codigo_pc);

-- 7. CLASIFICACIÓN Y ASIGNACIÓN ASISTIDA PARA CARGOS EXISTENTES
UPDATE cargos SET codigo_dc = 'DC-0012' WHERE nombre ILIKE 'Gerente Sr%';
UPDATE cargos SET codigo_dc = 'DC-0011' WHERE nombre ILIKE 'Gerente Jr%';
UPDATE cargos SET codigo_dc = 'DC-0010' WHERE nombre ILIKE 'Gerente%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0001' WHERE nombre ILIKE 'Analista%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0002' WHERE nombre ILIKE 'Aprendiz%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0003' WHERE nombre ILIKE 'Asesor%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0004' WHERE nombre ILIKE 'Asistente%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0005' WHERE nombre ILIKE 'Coordinador%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0006' WHERE nombre ILIKE 'Directivo%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0007' WHERE nombre ILIKE 'Director%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0008' WHERE nombre ILIKE 'Ejecutivo%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0009' WHERE nombre ILIKE 'Especialista%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0013' WHERE (nombre ILIKE 'Lider%' OR nombre ILIKE 'Líder%') AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0014' WHERE (nombre ILIKE 'Operario%' OR nombre ILIKE 'Operador%') AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0015' WHERE nombre ILIKE 'Pasante%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0016' WHERE nombre ILIKE 'Supervisor%' AND codigo_dc IS NULL;
UPDATE cargos SET codigo_dc = 'DC-0017' WHERE nombre ILIKE 'Trainee%' AND codigo_dc IS NULL;
