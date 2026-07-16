-- Agrega columna observaciones_generales a la tabla refugiados
ALTER TABLE refugiados ADD COLUMN IF NOT EXISTS observaciones_generales TEXT;
