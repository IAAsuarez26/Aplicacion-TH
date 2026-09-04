-- ====================================================================================
-- INSERCIÓN DE DATOS: Tabla perfiles_competencias
-- Fuente: Perfiles_Competencias.xlsx (Carpeta documentos)
-- Dialecto: PostgreSQL (InsForge DB: TH_PB)
-- ====================================================================================

INSERT INTO perfiles_competencias (codigo_pc, perfil, activo)
VALUES
    ('PC-0001', 'Administrativo', TRUE),
    ('PC-0002', 'Líder', TRUE),
    ('PC-0003', 'Operativo', TRUE)
ON CONFLICT (codigo_pc) DO UPDATE SET
    perfil = EXCLUDED.perfil,
    activo = EXCLUDED.activo;
