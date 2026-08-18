-- ====================================================================================
-- INSERCIÓN DE DATOS: Tabla direcciones
-- Fuente: Direcciones.xlsx (Nómina Galac)
-- Dialecto: PostgreSQL (InsForge)
-- Total Registros: 8 (Dir-0001 al Dir-0008)
-- ====================================================================================

INSERT INTO direcciones (codigo, nombre, descripcion, estado, empresa_id, director_id)
VALUES
    ('Dir-0001', 'Ventas', 'Ventas', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0002', 'Finanzas', 'Finanzas', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0003', 'Sistemas y Tecnología', 'Sistemas y Tecnología', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0004', 'Finanzas', 'Finanzas', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0005', 'Cadena de Suministro', 'Cadena de Suministro', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0006', 'Talento Humano', 'Talento Humano', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0007', 'Mercadeo', 'Mercadeo', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL),
    ('Dir-0008', 'Dirección Técnica', 'Dirección Técnica', TRUE, (SELECT empresa_id FROM empresas WHERE codigo = '0002' LIMIT 1), NULL)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado,
    empresa_id = EXCLUDED.empresa_id,
    updated_at = CURRENT_TIMESTAMP;
