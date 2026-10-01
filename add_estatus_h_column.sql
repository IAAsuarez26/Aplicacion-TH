-- Migracion: Adicion de columna estatus_h para gobernanza de sincronizacion Humand
-- Regla: estatus_h = 1 indica que el registro sube/se sincroniza con Humand.
--        estatus_h = 0 indica que el registro no sube a Humand (es estrictamente local).

-- 1. Tabla empleados
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS estatus_h SMALLINT DEFAULT 0;

-- Asignar 1 a los 161 colaboradores que ya existen en Humand
UPDATE empleados SET estatus_h = 1;

-- Asignar 0 a los 15 colaboradores que NO estan en Humand
UPDATE empleados SET estatus_h = 0 
WHERE empleado_id IN (35, 75, 90, 151, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172);

-- 2. Tabla departamentos
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS estatus_h SMALLINT DEFAULT 1;
UPDATE departamentos SET estatus_h = 1 WHERE estatus_h IS NULL;

-- 3. Tabla cargos
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS estatus_h SMALLINT DEFAULT 1;
UPDATE cargos SET estatus_h = 1 WHERE estatus_h IS NULL;
