-- ====================================================================================
-- INSERCIÓN DE DATOS: Tabla gerencias
-- Fuente: Gerencias.xlsx (Nómina Galac)
-- Dialecto: PostgreSQL (InsForge)
-- Total Registros: 23 (Ger-0001 al Ger-0023)
-- ====================================================================================

INSERT INTO gerencias (codigo, nombre, descripcion, estado, direccion_id)
VALUES
    ('Ger-0001', 'Ventas', 'Ventas', TRUE, NULL),
    ('Ger-0002', 'Sistemas y Tecnología', 'Sistemas y Tecnología', TRUE, NULL),
    ('Ger-0003', 'Servicios Generales', 'Servicios Generales', TRUE, NULL),
    ('Ger-0004', 'Almacén', 'Almacén', TRUE, NULL),
    ('Ger-0005', 'Producción', 'Producción', TRUE, NULL),
    ('Ger-0006', 'Cadena de Suministro', 'Cadena de Suministro', TRUE, NULL),
    ('Ger-0007', 'Corporativa de Proyectos', 'Corporativa de Proyectos', TRUE, NULL),
    ('Ger-0008', 'Mantenimiento', 'Mantenimiento', TRUE, NULL),
    ('Ger-0009', 'Operaciones Logísticas', 'Operaciones Logísticas', TRUE, NULL),
    ('Ger-0010', 'Mercadeo', 'Mercadeo', TRUE, NULL),
    ('Ger-0011', 'Control de Calidad', 'Control de Calidad', TRUE, NULL),
    ('Ger-0012', 'Compras', 'Compras', TRUE, NULL),
    ('Ger-0013', 'Innovación y Empaque', 'Innovación y Empaque', TRUE, NULL),
    ('Ger-0014', 'Aseguramiento de la Calidad', 'Aseguramiento de la Calidad', TRUE, NULL),
    ('Ger-0015', 'Operación Logística Gastos', 'Operación Logística Gastos', TRUE, NULL),
    ('Ger-0016', 'Talento Humano', 'Talento Humano', TRUE, NULL),
    ('Ger-0017', 'Tesorería', 'Tesorería', TRUE, NULL),
    ('Ger-0018', 'Investigación y Desarrollo', 'Investigación y Desarrollo', TRUE, NULL),
    ('Ger-0019', 'Seguridad y Salud Laboral', 'Seguridad y Salud Laboral', TRUE, NULL),
    ('Ger-0020', 'Asuntos Regulatorios', 'Asuntos Regulatorios', TRUE, NULL),
    ('Ger-0021', 'Inteligencia de Negocios', 'Inteligencia de Negocios', TRUE, NULL),
    ('Ger-0022', 'Planificación', 'Planificación', TRUE, NULL),
    ('Ger-0023', 'Consultoría Jurídica', 'Consultoría Jurídica', TRUE, NULL)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado,
    updated_at = CURRENT_TIMESTAMP;
