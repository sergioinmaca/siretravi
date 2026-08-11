-- Migración: Campo "responsable" en eventos (Módulo Agenda)
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS responsable TEXT;
