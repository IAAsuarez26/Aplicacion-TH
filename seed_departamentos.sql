-- ====================================================================================
-- INSERCIÓN DE DATOS: Tabla departamentos (Actualizado con códigos correlativos)
-- Fuente: Departamentos.xlsx (Nómina Galac)
-- Dialecto: PostgreSQL (InsForge)
-- Total Registros: 36 (Dep-0001 al Dep-0036)
-- ====================================================================================

INSERT INTO departamentos (codigo, nombre, descripcion, estado, gerencia_id)
VALUES
    ('Dep-0001', 'Administración de Ventas', 'Administración de Ventas', TRUE, NULL),
    ('Dep-0002', 'Almacén de Insumos MOI', 'Almacén de Insumos MOI', TRUE, NULL),
    ('Dep-0003', 'Aseguramiento de la Calidad MOI', 'Aseguramiento de la Calidad MOI', TRUE, NULL),
    ('Dep-0004', 'Asuntos Regulatorios', 'Asuntos Regulatorios', TRUE, NULL),
    ('Dep-0005', 'Compensación', 'Compensación', TRUE, NULL),
    ('Dep-0006', 'Compras', 'Compras', TRUE, NULL),
    ('Dep-0007', 'Consultoría Jurídica', 'Consultoría Jurídica', TRUE, NULL),
    ('Dep-0008', 'Contraloría', 'Contraloría', TRUE, NULL),
    ('Dep-0009', 'Control de Calidad MOI', 'Control de Calidad MOI', TRUE, NULL),
    ('Dep-0010', 'Dirección Técnica', 'Dirección Técnica', TRUE, NULL),
    ('Dep-0011', 'Elaboración MOD', 'Elaboración MOD', TRUE, NULL),
    ('Dep-0012', 'Elaboración MOI', 'Elaboración MOI', TRUE, NULL),
    ('Dep-0013', 'Empaque MOD', 'Empaque MOD', TRUE, NULL),
    ('Dep-0014', 'Empaque MOI', 'Empaque MOI', TRUE, NULL),
    ('Dep-0015', 'Gerencia Corporativa de Proyectos', 'Gerencia Corporativa de Proyectos', TRUE, NULL),
    ('Dep-0016', 'Innovación y Empaque', 'Innovación y Empaque', TRUE, NULL),
    ('Dep-0017', 'Inteligencia de Negocios', 'Inteligencia de Negocios', TRUE, NULL),
    ('Dep-0018', 'Investigación y Desarrollo', 'Investigación y Desarrollo', TRUE, NULL),
    ('Dep-0019', 'Mantenimiento Técnico y Servicios', 'Mantenimiento Técnico y Servicios', TRUE, NULL),
    ('Dep-0020', 'Mantenimiento Técnico y Servicios MOI', 'Mantenimiento Técnico y Servicios MOI', TRUE, NULL),
    ('Dep-0021', 'Mercadeo', 'Mercadeo', TRUE, NULL),
    ('Dep-0022', 'Operación Logística Gastos', 'Operación Logística Gastos', TRUE, NULL),
    ('Dep-0023', 'Operación Logística MOD', 'Operación Logística MOD', TRUE, NULL),
    ('Dep-0024', 'Operación Logística MOI', 'Operación Logística MOI', TRUE, NULL),
    ('Dep-0025', 'Pesada MOD', 'Pesada MOD', TRUE, NULL),
    ('Dep-0026', 'Planificación', 'Planificación', TRUE, NULL),
    ('Dep-0027', 'Presidencia', 'Presidencia', TRUE, NULL),
    ('Dep-0028', 'Producción', 'Producción', TRUE, NULL),
    ('Dep-0029', 'Seguridad y Salud Laboral', 'Seguridad y Salud Laboral', TRUE, NULL),
    ('Dep-0030', 'Servicios Generales', 'Servicios Generales', TRUE, NULL),
    ('Dep-0031', 'Sistemas y Tecnología', 'Sistemas y Tecnología', TRUE, NULL),
    ('Dep-0032', 'Talento Humano', 'Talento Humano', TRUE, NULL),
    ('Dep-0033', 'Tesorería', 'Tesorería', TRUE, NULL),
    ('Dep-0034', 'Único', 'Único', TRUE, NULL),
    ('Dep-0035', 'Ventas', 'Ventas', TRUE, NULL),
    ('Dep-0036', 'Vicepresidencia', 'Vicepresidencia', TRUE, NULL)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado,
    updated_at = CURRENT_TIMESTAMP;
