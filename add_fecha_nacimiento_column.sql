-- Migracion: Adicion de columna fecha_nacimiento a la tabla empleados
-- Permite registrar y exportar la fecha de nacimiento del colaborador de forma individual y disociada.

ALTER TABLE empleados ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
