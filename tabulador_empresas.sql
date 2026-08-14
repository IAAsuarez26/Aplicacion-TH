-- ====================================================================================
-- SISTEMA DE GESTIÓN DE TALENTO HUMANO (TH)
-- Script DDL / DML: Tabulador Salarial por Empresas
-- Origen de Datos: TabuladorEmpresas.xlsx
-- Dialecto: PostgreSQL (PL/pgSQL) - InsForge DB (TH_PB)
-- ====================================================================================

-- ====================================================================================
-- 1. FUNCIÓN REUTILIZABLE PARA ACTUALIZAR TIMESTAMP (updated_at)
-- ====================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 2. ELIMINACIÓN PREVIA DE OBJETOS (Opcional / Idempotente)
-- ====================================================================================
DROP VIEW IF EXISTS vw_tabulador_empresas_resumen CASCADE;
DROP TABLE IF EXISTS tabulador_empresas CASCADE;

-- ====================================================================================
-- 3. CREACIÓN DE LA TABLA: tabulador_empresas
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
    
    -- Restricción de unicidad para empresa y banda
    CONSTRAINT uq_tabulador_empresa_banda UNIQUE (empresa_id, codigo_banda),
    
    -- Validaciones de integridad salarial
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

-- ====================================================================================
-- 4. COMENTARIOS DE DOCUMENTACIÓN
-- ====================================================================================
COMMENT ON TABLE tabulador_empresas IS 'Catálogo y estructura de bandas salariales por empresa (Tabulador Salarial TH).';
COMMENT ON COLUMN tabulador_empresas.tabulador_id IS 'Identificador único secuencial del registro de tabulador.';
COMMENT ON COLUMN tabulador_empresas.empresa_id IS 'Clave foránea a la tabla empresas (empresa_id).';
COMMENT ON COLUMN tabulador_empresas.codigo_empresa IS 'Código de la entidad/empresa (ej. 0002, 0003, 0004).';
COMMENT ON COLUMN tabulador_empresas.codigo_banda IS 'Código alfanumérico de la banda salarial (ej. PB1-PB7, LP1-LP7, VT1-VT5, PK1-PK4, PBP, PBD, PBI).';
COMMENT ON COLUMN tabulador_empresas.cargos_referencia IS 'Cargos, roles o niveles organizacionales asociados a esta banda.';
COMMENT ON COLUMN tabulador_empresas.salario_minimo_80 IS 'Salario límite inferior de la banda (80% del punto medio / mediana).';
COMMENT ON COLUMN tabulador_empresas.salario_medio_bajo_90 IS 'Salario nivel medio-bajo de la banda (90% del punto medio / mediana).';
COMMENT ON COLUMN tabulador_empresas.salario_mediana_100 IS 'Punto medio de la banda salarial (Mediana / 100% de referencia).';
COMMENT ON COLUMN tabulador_empresas.salario_medio_alto_110 IS 'Salario nivel medio-alto de la banda (110% del punto medio / mediana).';
COMMENT ON COLUMN tabulador_empresas.salario_maximo_120 IS 'Salario límite superior de la banda (120% del punto medio / mediana).';
COMMENT ON COLUMN tabulador_empresas.progresion IS 'Factor porcentual de progresión/diferencial respecto a la banda inferior inmediata.';
COMMENT ON COLUMN tabulador_empresas.activo IS 'Indica si la banda se encuentra activa en el tabulador vigente.';
COMMENT ON COLUMN tabulador_empresas.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN tabulador_empresas.updated_at IS 'Fecha y hora de última modificación del registro.';

-- ====================================================================================
-- 5. DISPARADOR (TRIGGER) PARA AUDITORÍA DE ACTUALIZACIÓN
-- ====================================================================================
CREATE TRIGGER trg_tabulador_empresas_updated_at
BEFORE UPDATE ON tabulador_empresas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================================
-- 6. ÍNDICES DE BÚSQUEDA Y RENDIMIENTO
-- ====================================================================================
CREATE INDEX idx_tabulador_empresa_id ON tabulador_empresas (empresa_id);
CREATE INDEX idx_tabulador_banda ON tabulador_empresas (codigo_banda);
CREATE INDEX idx_tabulador_activos ON tabulador_empresas (empresa_id, activo) WHERE activo = TRUE;

-- ====================================================================================
-- 7. INSERCIÓN DE DATOS DESDE TabuladorEmpresas.xlsx (Idempotente con ON CONFLICT)
-- ====================================================================================
INSERT INTO tabulador_empresas (
    empresa_id,
    codigo_empresa,
    codigo_banda,
    cargos_referencia,
    salario_minimo_80,
    salario_medio_bajo_90,
    salario_mediana_100,
    salario_medio_alto_110,
    salario_maximo_120,
    progresion
) VALUES
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB7', 'Directivos', 238.8787, 268.7386, 298.5984, 328.4582, 358.3181, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB6', 'Directores', 199.0656, 223.9488, 248.8320, 273.7152, 298.5984, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB5', 'Gerentes', 165.8880, 186.6240, 207.3600, 228.0960, 248.8320, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB4', 'Gerente Jr / Coordinadores', 138.2400, 155.5200, 172.8000, 190.0800, 207.3600, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB3', 'Especialistas / Supervisores / Mecánicos / Analistas de Ventas', 115.2000, 129.6000, 144.0000, 158.4000, 172.8000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB2', 'Analistas', 96.0000, 108.0000, 120.0000, 132.0000, 144.0000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PB1', 'Asistentes / Trainee / Operarios', 80.0000, 90.0000, 100.0000, 110.0000, 120.0000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP7', 'Directivos', 238.8787, 268.7386, 298.5984, 328.4582, 358.3181, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP6', 'Directores', 199.0656, 223.9488, 248.8320, 273.7152, 298.5984, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP5', 'Gerentes', 165.8880, 186.6240, 207.3600, 228.0960, 248.8320, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP4', 'Gerente Jr / Coordinadores / Supervisor de Elaboración', 138.2400, 155.5200, 172.8000, 190.0800, 207.3600, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP3', 'Especialistas / Supervisores', 115.2000, 129.6000, 144.0000, 158.4000, 172.8000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP2', 'Asistentes / Analistas / Operarios de Elaboración', 96.0000, 108.0000, 120.0000, 132.0000, 144.0000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0003'), '0003', 'LP1', 'Operarios', 80.0000, 90.0000, 100.0000, 110.0000, 120.0000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'VT5', 'Directores', 165.8880, 186.6240, 207.3600, 228.0960, 248.8320, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'VT4', 'Gerentes', 138.2400, 155.5200, 172.8000, 190.0800, 207.3600, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'VT3', 'Lider Ventas', 115.2000, 129.6000, 144.0000, 158.4000, 172.8000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'VT2', 'Asesor', 96.0000, 108.0000, 120.0000, 132.0000, 144.0000, 0.200000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'VT1', 'Analista / Ejecutivo/ Coordinador / Especialista', 80.0000, 90.0000, 100.0000, 110.0000, 120.0000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0004'), '0004', 'PK4', 'Gerentes', 1120.0000, 1260.0000, 1400.0000, 1540.0000, 1680.0000, 1.434783),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0004'), '0004', 'PK3', 'Coordinadores / Especialistas', 460.0000, 517.5000, 575.0000, 632.5000, 690.0000, 0.210526),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0004'), '0004', 'PK2', 'Analistas', 380.0000, 427.5000, 475.0000, 522.5000, 570.0000, 0.184539),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0004'), '0004', 'PK1', 'Asistentes / Operarios', 320.8000, 360.9000, 401.0000, 441.1000, 481.2000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PBP', 'Pasante', 148.0000, 166.5000, 185.0000, 203.5000, 222.0000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PBD', 'Donaciones', 40.0000, 45.0000, 50.0000, 55.0000, 60.0000, 0.000000),
    ((SELECT empresa_id FROM empresas WHERE codigo = '0002'), '0002', 'PBI', 'INCES', 0.3120, 0.3510, 0.3900, 0.4290, 0.4680, 0.000000)
ON CONFLICT (empresa_id, codigo_banda) DO UPDATE SET
    cargos_referencia = EXCLUDED.cargos_referencia,
    salario_minimo_80 = EXCLUDED.salario_minimo_80,
    salario_medio_bajo_90 = EXCLUDED.salario_medio_bajo_90,
    salario_mediana_100 = EXCLUDED.salario_mediana_100,
    salario_medio_alto_110 = EXCLUDED.salario_medio_alto_110,
    salario_maximo_120 = EXCLUDED.salario_maximo_120,
    progresion = EXCLUDED.progresion,
    updated_at = CURRENT_TIMESTAMP;

-- ====================================================================================
-- 8. VISTA ANALÍTICA COMPLEMENTARIA (Formato y Análisis Salarial)
-- ====================================================================================
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

-- ====================================================================================
-- 9. FUNCIÓN DE UTILIDAD: Calcular Ubicación Salarial (Compa-Ratio)
-- ====================================================================================
CREATE OR REPLACE FUNCTION fn_evaluar_posicion_salarial(
    p_codigo_empresa VARCHAR,
    p_codigo_banda VARCHAR,
    p_salario_actual NUMERIC
)
RETURNS TABLE (
    codigo_empresa VARCHAR,
    codigo_banda VARCHAR,
    salario_actual NUMERIC,
    mediana NUMERIC,
    compa_ratio NUMERIC,
    posicion_banda TEXT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.codigo_empresa,
        t.codigo_banda,
        p_salario_actual AS salario_actual,
        t.salario_mediana_100 AS mediana,
        ROUND((p_salario_actual / NULLIF(t.salario_mediana_100, 0)) * 100, 2) AS compa_ratio,
        CASE
            WHEN p_salario_actual < t.salario_minimo_80 THEN 'Por debajo del mínimo (<80%)'
            WHEN p_salario_actual < t.salario_medio_bajo_90 THEN 'Nivel Inferior (80% - 90%)'
            WHEN p_salario_actual < t.salario_mediana_100 THEN 'Nivel Medio-Bajo (90% - 100%)'
            WHEN p_salario_actual = t.salario_mediana_100 THEN 'En la Mediana Exacta (100%)'
            WHEN p_salario_actual <= t.salario_medio_alto_110 THEN 'Nivel Medio-Alto (100% - 110%)'
            WHEN p_salario_actual <= t.salario_maximo_120 THEN 'Nivel Superior (110% - 120%)'
            ELSE 'Por encima del máximo (>120%)'
        END AS posicion_banda
    FROM tabulador_empresas t
    WHERE t.codigo_empresa = p_codigo_empresa AND t.codigo_banda = p_codigo_banda;
END;
$$ LANGUAGE plpgsql;
