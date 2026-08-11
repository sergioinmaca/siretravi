-- Migración: Campo "responsable" obligatorio en eventos (Módulo Agenda)
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS responsable TEXT;

UPDATE eventos
SET responsable = 'RESPONSABLE'
WHERE responsable IS NULL OR BTRIM(responsable) = '';

ALTER TABLE eventos ALTER COLUMN responsable SET NOT NULL;
