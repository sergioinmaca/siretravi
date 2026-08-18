-- ================================================
-- SIRETRAVI - Migración: tipo_acta.contar_en_croquis
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

-- Indica si las actas de este tipo deben contarse en el croquis del módulo Actas
-- (solo las actas de indisciplina y afines deberían colorear el croquis)
ALTER TABLE tipo_acta ADD COLUMN IF NOT EXISTS contar_en_croquis BOOLEAN NOT NULL DEFAULT true;

-- El acta de compromiso de conducta NO debe pintar las camas en el croquis
UPDATE tipo_acta SET contar_en_croquis = false WHERE nombre = 'ACTA DE COMPROMISO DE CONDUCTA';
