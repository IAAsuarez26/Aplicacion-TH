-- ====================================================================================
-- INSERCIÓN DE DATOS: Tabla denominaciones_cargos
-- Fuente: Denominaciones_Cargos.xlsx (Carpeta documentos)
-- Dialecto: PostgreSQL (InsForge DB: TH_PB)
-- ====================================================================================

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
