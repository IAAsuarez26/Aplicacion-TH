-- Migracion: Adicion de columnas ubicacion, edo_civil y nivel_educativo a la tabla empleados
-- Estos campos se integran y sincronizan con Humand:
-- 1. ubicacion -> Segmentacion "Ubicación" en Humand (id: 451900)
-- 2. edo_civil -> Profile Field "Estado Civil" en Humand (uuid: 52005932-0bdb-438d-834c-82d8e3330e26)
-- 3. nivel_educativo -> Profile Field "Nivel Educativo" en Humand (uuid: a0b1e6b5-4bc7-444b-a27c-2844dd5a9532)

ALTER TABLE empleados ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(100);
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS edo_civil VARCHAR(50);
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS nivel_educativo VARCHAR(100);

-- Inicializar ubicacion a partir de sede si existe
UPDATE empleados SET ubicacion = sede WHERE ubicacion IS NULL AND sede IS NOT NULL;
