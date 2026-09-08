-- ====================================================================================
-- MIGRACIÓN DDL / DML: Reubicación de Centros de Costos a Gerencias (Nivel 2)
-- Base de Datos: InsForge (TH_PB) - Dialecto: PostgreSQL
-- Objetivo: La tabla centros_costos ahora se vincula con gerencias (no con departamentos).
-- ====================================================================================

-- 1. AÑADIR COLUMNA codigo_cc A gerencias
ALTER TABLE public.gerencias 
ADD COLUMN IF NOT EXISTS codigo_cc VARCHAR(20) NULL;

-- 2. CREAR CLAVE FORÁNEA fk_gerencias_codigo_cc
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_gerencias_codigo_cc'
    ) THEN
        ALTER TABLE public.gerencias
        ADD CONSTRAINT fk_gerencias_codigo_cc
        FOREIGN KEY (codigo_cc) REFERENCES public.centros_costos (codigo_cc)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. CREAR ÍNDICE PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_gerencias_codigo_cc ON public.gerencias (codigo_cc);

-- 4. TRASPASO / MIGRACIÓN DE DATOS EXISTENTES
-- Mueve los centros de costo asignados previamente en departamentos a sus respectivas gerencias padre
UPDATE public.gerencias g
SET codigo_cc = dep.codigo_cc,
    updated_at = CURRENT_TIMESTAMP
FROM public.departamentos dep
WHERE dep.codigo_gerencia = g.codigo
  AND dep.codigo_cc IS NOT NULL
  AND (g.codigo_cc IS NULL OR g.codigo_cc = '');

-- 5. RECREAR VISTA vw_organigrama_completo VINCULANDO CENTRO DE COSTO DESDE GERENCIAS
CREATE OR REPLACE VIEW vw_organigrama_completo AS
SELECT 
    e.empleado_id,
    e.codigo_empleado,
    e.documento_identidad,
    CONCAT(e.nombres, ' ', e.apellidos) AS nombre_completo_empleado,
    e.genero,
    e.sede,
    e.email AS email_empleado,
    e.telefono AS telefono_empleado,
    e.estado_laboral,
    e.fecha_ingreso,
    
    -- Empresa
    emp.empresa_id,
    emp.codigo AS empresa_codigo,
    emp.razon_social AS empresa_razon_social,
    emp.nombre_corto AS empresa_nombre_corto,
    
    -- Cargo y Catálogos
    c.cargo_id,
    c.codigo AS cargo_codigo,
    c.nombre AS cargo_nombre,
    c.codigo_dc,
    dc.denominacion AS cargo_denominacion,
    e.codigo_pc,
    pc.perfil AS perfil_competencia_nombre,
    
    -- Tabulador Salarial
    t.tabulador_id,
    t.codigo_banda AS banda_codigo,
    t.cargos_referencia AS banda_cargos_referencia,
    t.salario_mediana_100 AS salario_mediana_banda,
    t.salario_minimo_80 AS salario_minimo_banda,
    t.salario_maximo_120 AS salario_maximo_banda,
    
    -- Departamento y Jefe
    dep.departamento_id,
    dep.codigo AS departamento_codigo,
    dep.nombre AS departamento_nombre,
    g.codigo_cc,
    cc.descripcion AS centro_costo_descripcion,
    e.codigo_tc,
    tc.nombre AS tipo_costo_nombre,
    tc.descripcion AS tipo_costo_descripcion,
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
    e.di_supervisor,
    CONCAT(sup.nombres, ' ', sup.apellidos) AS supervisor_directo_nombre,
    sup.email AS supervisor_directo_email,

    -- Evaluador de Desempeño
    e.di_evaluador,
    CONCAT(ev.nombres, ' ', ev.apellidos) AS evaluador_especifico_nombre,
    ev.email AS evaluador_especifico_email,

    -- Evaluador Efectivo
    COALESCE(CONCAT(ev.nombres, ' ', ev.apellidos), CONCAT(sup.nombres, ' ', sup.apellidos)) AS evaluador_efectivo_nombre,
    COALESCE(ev.email, sup.email) AS evaluador_efectivo_email,
    CASE 
        WHEN e.di_evaluador IS NOT NULL AND e.di_evaluador <> e.di_supervisor THEN 'EVALUADOR_ESPECIAL'
        ELSE 'SUPERVISOR_DIRECTO'
    END AS tipo_evaluador

FROM empleados e
LEFT JOIN cargos c ON e.codigo_cargo = c.codigo
LEFT JOIN denominaciones_cargos dc ON c.codigo_dc = dc.codigo_dc
LEFT JOIN perfiles_competencias pc ON e.codigo_pc = pc.codigo_pc
LEFT JOIN departamentos dep ON e.codigo_departamento = dep.codigo
LEFT JOIN gerencias g ON dep.codigo_gerencia = g.codigo
LEFT JOIN centros_costos cc ON g.codigo_cc = cc.codigo_cc
LEFT JOIN tipo_costos tc ON e.codigo_tc = tc.codigo_tc
LEFT JOIN direcciones d ON g.codigo_direccion = d.codigo
LEFT JOIN empresas emp ON d.empresa_id = emp.empresa_id
LEFT JOIN tabulador_empresas t ON e.tabulador_id = t.tabulador_id
LEFT JOIN empleados sup ON e.di_supervisor = sup.documento_identidad
LEFT JOIN empleados ev ON e.di_evaluador = ev.documento_identidad
LEFT JOIN empleados jefe_dep ON dep.jefe_departamento_id = jefe_dep.empleado_id
LEFT JOIN empleados ger ON g.gerente_id = ger.empleado_id
LEFT JOIN empleados dir ON d.director_id = dir.empleado_id;

-- 6. DESVINCULAR CENTRO DE COSTOS DE LA TABLA DEPARTAMENTOS
ALTER TABLE public.departamentos DROP CONSTRAINT IF EXISTS fk_departamentos_codigo_cc;
DROP INDEX IF EXISTS idx_departamentos_codigo_cc;
ALTER TABLE public.departamentos DROP COLUMN IF EXISTS codigo_cc;

-- 7. REFRESCAR PERMISOS
GRANT ALL PRIVILEGES ON TABLE public.gerencias TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.departamentos TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.vw_organigrama_completo TO anon, authenticated;
